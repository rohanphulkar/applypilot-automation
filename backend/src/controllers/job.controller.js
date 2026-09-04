import { v4 as uuidv4 } from "uuid";
import Job from "../models/job.model.js";
import { addJobToQueue } from "../queues/job.queue.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * POST /api/jobs
 * Creates a job application record and enqueues it for BullMQ background processing.
 */
export async function createJob(req, res, next) {
  try {
    const { job_description } = req.body;

    // Validate that job_description is provided and is a non-empty string
    if (!job_description || typeof job_description !== "string" || !job_description.trim()) {
      throw new ValidationError("The 'job_description' field is required and must be a non-empty string.");
    }

    const trimmedDescription = job_description.trim();
    const jobId = uuidv4();

    // 1. Save initial record in MongoDB with initialized timeline & progress
    const newJob = await Job.create({
      jobId,
      status: "QUEUED",
      originalJobDescription: trimmedDescription,
      processing: {
        currentStage: "QUEUED",
        progress: 0,
        startedAt: null,
        completedAt: null,
      },
      timeline: [
        {
          stage: "QUEUED",
          status: "QUEUED",
          message: "Application submitted and queued for background processing",
          createdAt: new Date(),
        },
      ],
    });

    // 2. Add job to BullMQ queue with only the jobId
    await addJobToQueue(jobId);

    logger.info("Created job application record and enqueued for processing", {
      applicationId: jobId,
      stage: "QUEUED",
    });

    // 3. Return immediate 202 Accepted response
    return res.status(202).json({
      success: true,
      message: "Job application processing queued",
      jobId: newJob.jobId,
      status: "QUEUED",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs/:id
 * Retrieves the complete lifecycle state and metadata of a job application.
 */
export async function getJob(req, res, next) {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!job) {
      throw new NotFoundError(`Job application with ID '${id}' not found.`);
    }

    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/jobs
 * Lists job applications with search, status filtering, sorting, and pagination.
 */
export async function listJobs(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const filter = {};

    // Status filter
    if (req.query.status && req.query.status !== "ALL") {
      filter.status = req.query.status.toUpperCase();
    }

    // Search query
    if (req.query.search && req.query.search.trim()) {
      const q = req.query.search.trim();
      filter.$or = [
        { "parsedJob.title": { $regex: q, $options: "i" } },
        { "parsedJob.company": { $regex: q, $options: "i" } },
        { "parsedJob.location": { $regex: q, $options: "i" } },
        { "parsedJob.skills": { $regex: q, $options: "i" } },
        { jobId: { $regex: q, $options: "i" } },
      ];
    }

    // Sort order
    let sort = { createdAt: -1 };
    if (req.query.sort === "oldest") {
      sort = { createdAt: 1 };
    } else if (req.query.sort === "company") {
      sort = { "parsedJob.company": 1, createdAt: -1 };
    } else if (req.query.sort === "role") {
      sort = { "parsedJob.title": 1, createdAt: -1 };
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Job.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs/:id/retry
 * Idempotently retries a failed application without duplicating already completed stages.
 */
export async function retryJob(req, res, next) {
  try {
    const { id } = req.params;

    const job = await Job.findOne({
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    const failedStage = job.error?.stage || job.processing?.currentStage;

    // Reset failed stage flags to allow re-execution
    if (failedStage === "TAILORING_RESUME" || failedStage === "COMPOSING_EMAIL") {
      job.resume.requestStatus = "PENDING";
      job.resume.urls = [];
    }
    if (failedStage === "GENERATING_COVER_LETTER") {
      job.coverLetter.status = "PENDING";
    }
    if (failedStage === "PARSING_JOB") {
      job.parsedJob = {
        title: null,
        company: null,
        location: null,
        skills: null,
        applicationEmail: null,
        salary: null,
        experienceLevel: null,
        summary: null,
      };
    }

    // Reset status to QUEUED
    job.status = "QUEUED";
    job.error = { stage: null, message: null };
    job.timeline.push({
      stage: "QUEUED",
      status: "RETRY_TRIGGERED",
      message: `Application retry triggered for failed stage [${failedStage || "UNKNOWN"}]`,
      createdAt: new Date(),
    });
    await job.save();

    // Re-enqueue in BullMQ
    await addJobToQueue(job.jobId);

    logger.info("Application retry initiated", {
      applicationId: job.jobId,
      retryingFromStage: failedStage,
    });

    return res.status(200).json({
      success: true,
      message: "Job retry queued successfully",
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/jobs/:id
 * Deletes an application record from MongoDB.
 */
export async function deleteJob(req, res, next) {
  try {
    const { id } = req.params;

    const job = await Job.findOneAndDelete({
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    });

    if (!job) {
      throw new NotFoundError(`Job application with ID '${id}' not found.`);
    }

    logger.info("Deleted job application record", { applicationId: job.jobId });

    return res.status(200).json({
      success: true,
      message: "Job application deleted successfully.",
      jobId: job.jobId,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createJob,
  getJob,
  listJobs,
  retryJob,
  deleteJob,
};
