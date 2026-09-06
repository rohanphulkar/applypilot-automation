import { v4 as uuidv4 } from "uuid";
import Job from "../models/job.model.js";
import { addJobToQueue } from "../queues/job.queue.js";
import { parseJobDescriptionImage } from "../services/job-parser.service.js";
import { sendApplicationEmailPipeline } from "../workers/job.worker.js";
import { ValidationError, NotFoundError } from "../utils/errors.js";
import logger from "../utils/logger.js";

/**
 * POST /api/jobs
 * Creates a job application record and enqueues it for background processing.
 */
export async function createJob(req, res, next) {
  try {
    const { job_description, screenshot } = req.body;
    const userId = req.auth?.userId || "user_demo_applypilot";

    // Validate that job_description is provided and is a non-empty string
    if (!job_description || typeof job_description !== "string" || !job_description.trim()) {
      throw new ValidationError("The 'job_description' field is required and must be a non-empty string.");
    }

    const trimmedDescription = job_description.trim();
    const jobId = uuidv4();

    // 1. Save initial record in MongoDB with initialized timeline & progress
    const newJob = await Job.create({
      userId,
      jobId,
      status: "QUEUED",
      originalJobDescription: trimmedDescription,
      screenshot: screenshot || { filename: null, contentType: null },
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

    // 2. Add job to BullMQ queue
    await addJobToQueue(jobId);

    logger.info("Created job application record and enqueued for processing", {
      applicationId: jobId,
      userId,
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
 * POST /api/jobs/parse-image
 * Parses an uploaded job description screenshot using Multimodal AI Vision.
 */
export async function parseJobImage(req, res, next) {
  try {
    const { image, mimeType } = req.body;

    if (!image) {
      throw new ValidationError("The 'image' field (base64 encoded) is required.");
    }

    const result = await parseJobDescriptionImage(image, mimeType || "image/png");

    return res.status(200).json({
      success: true,
      message: "Job description screenshot extracted successfully",
      data: result,
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
    const userId = req.auth?.userId;

    const query = {
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    };
    if (userId && !req.auth?.isDemo) {
      query.userId = userId;
    }

    const job = await Job.findOne(query);

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
 * Lists job applications with search, status filtering, sorting, and pagination scoped to the user.
 */
export async function listJobs(req, res, next) {
  try {
    const userId = req.auth?.userId;
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const skip = (page - 1) * limit;

    const filter = {};
    if (userId && !req.auth?.isDemo) {
      filter.userId = userId;
    }

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
 * PATCH /api/jobs/:id
 * Updates job application fields (edited cover letter, subject, recruiter email, etc.)
 */
export async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const { coverLetter, email, parsedJob, attachmentFormat, resume } = req.body;

    const query = {
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    };
    if (userId && !req.auth?.isDemo) {
      query.$or = [
        { jobId: id, userId },
        { jobId: id, userId: "user_demo_applypilot" },
        ...(id.match(/^[0-9a-fA-F]{24}$/)
          ? [{ _id: id, userId }, { _id: id, userId: "user_demo_applypilot" }]
          : []),
      ];
    }

    const job = await Job.findOne(query);
    if (!job) {
      throw new NotFoundError(`Job application with ID '${id}' not found.`);
    }

    if (coverLetter !== undefined) {
      const content =
        typeof coverLetter === "string" ? coverLetter : coverLetter?.content || job.coverLetter?.content;
      job.coverLetter.content = content;
      job.coverLetter.status = "COMPLETED";
      if (job.email) {
        job.email.body = content;
      }
      job.markModified("coverLetter");
      job.markModified("email");
    }

    if (email) {
      if (email.subject !== undefined) job.email.subject = email.subject;
      if (email.body !== undefined) {
        job.email.body = email.body;
        if (job.coverLetter) {
          job.coverLetter.content = email.body;
          job.markModified("coverLetter");
        }
      }
      if (email.recruiterEmail !== undefined) {
        job.email.recruiterEmail = email.recruiterEmail ? email.recruiterEmail.trim().toLowerCase() : null;
        if (job.parsedJob) {
          job.parsedJob.applicationEmail = job.email.recruiterEmail;
          job.markModified("parsedJob");
        }
      }
      job.markModified("email");
    }

    if (parsedJob) {
      if (parsedJob.title !== undefined) job.parsedJob.title = parsedJob.title;
      if (parsedJob.company !== undefined) job.parsedJob.company = parsedJob.company;
      if (parsedJob.location !== undefined) job.parsedJob.location = parsedJob.location;
      if (parsedJob.applicationEmail !== undefined) {
        job.parsedJob.applicationEmail = parsedJob.applicationEmail;
        job.email.recruiterEmail = parsedJob.applicationEmail;
      }
      job.markModified("parsedJob");
      job.markModified("email");
    }

    if (attachmentFormat !== undefined) {
      if (!job.resume) job.resume = {};
      job.resume.attachmentFormat = attachmentFormat;
      job.markModified("resume");
    }

    if (resume) {
      if (!job.resume) job.resume = {};
      if (resume.attachmentFormat !== undefined) job.resume.attachmentFormat = resume.attachmentFormat;
      if (resume.pdfUrl !== undefined) job.resume.pdfUrl = resume.pdfUrl;
      if (resume.docxUrl !== undefined) job.resume.docxUrl = resume.docxUrl;
      if (resume.urls !== undefined) job.resume.urls = resume.urls;
      job.markModified("resume");
    }

    job.timeline.push({
      stage: job.status,
      status: "UPDATED",
      message: "Application details updated by user.",
      createdAt: new Date(),
    });

    await job.save();

    return res.status(200).json({
      success: true,
      message: "Job application updated successfully",
      data: job,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/jobs/:id/send
 * Manually approves and triggers email sending via SMTP and IMAP Sent folder sync.
 */
export async function sendJobEmail(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;
    const customOverrides = req.body || {};

    const query = {
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    };
    if (userId && !req.auth?.isDemo) {
      query.$or = [
        { jobId: id, userId },
        { jobId: id, userId: "user_demo_applypilot" },
        ...(id.match(/^[0-9a-fA-F]{24}$/)
          ? [{ _id: id, userId }, { _id: id, userId: "user_demo_applypilot" }]
          : []),
      ];
    }

    const job = await Job.findOne(query);
    if (!job) {
      throw new NotFoundError(`Job application with ID '${id}' not found.`);
    }

    // Apply any custom email overrides upfront
    if (customOverrides.subject) job.email.subject = customOverrides.subject.trim();
    if (customOverrides.body) {
      job.email.body = customOverrides.body;
      job.coverLetter.content = customOverrides.body;
    }
    if (customOverrides.recruiterEmail) {
      job.email.recruiterEmail = customOverrides.recruiterEmail.trim().toLowerCase();
    }
    if (customOverrides.attachmentFormat) {
      if (!job.resume) job.resume = {};
      job.resume.attachmentFormat = customOverrides.attachmentFormat;
      job.markModified("resume");
    }

    if (!job.email.recruiterEmail) {
      throw new BadRequestError("Cannot send application: Recruiter contact email is required.");
    }

    // Update status to SENDING_EMAIL (85%) immediately so the UI responds without lag
    job.status = "SENDING_EMAIL";
    job.processing = {
      currentStage: "SENDING_EMAIL",
      progress: 85,
      startedAt: job.processing?.startedAt || new Date(),
    };
    job.timeline.push({
      stage: "SENDING_EMAIL",
      status: "APPROVED_BY_USER",
      message: `Application email approved by user; dispatching in background to ${job.email.recruiterEmail}`,
      createdAt: new Date(),
    });

    job.markModified("email");
    job.markModified("coverLetter");
    job.markModified("processing");
    await job.save();

    // Trigger non-blocking asynchronous background execution
    setImmediate(() => {
      sendApplicationEmailPipeline(
        id,
        userId && !req.auth?.isDemo ? userId : null,
        customOverrides
      ).catch((err) => {
        logger.error(`Background email dispatch failed for application ${id}:`, err.message);
      });
    });

    return res.status(200).json({
      success: true,
      message: "Application approved! Email is dispatching in the background.",
      data: job,
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
    const userId = req.auth?.userId;

    const query = {
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    };
    if (userId && !req.auth?.isDemo) {
      query.userId = userId;
    }

    const job = await Job.findOne(query);
    if (!job) {
      throw new NotFoundError(`Job application with ID '${id}' not found.`);
    }

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
        salaryMin: null,
        salaryMax: null,
        salaryCurrency: null,
        responsibilities: null,
        requirements: null,
      };
    }

    // Reset status to QUEUED
    job.status = "QUEUED";
    job.error = { stage: null, message: null };
    job.timeline.push({
      stage: "QUEUED",
      status: "RETRY_TRIGGERED",
      message: `Application retry triggered for stage [${failedStage || "UNKNOWN"}]`,
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
    const userId = req.auth?.userId;

    const query = {
      $or: [{ jobId: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])],
    };
    if (userId && !req.auth?.isDemo) {
      query.userId = userId;
    }

    const job = await Job.findOneAndDelete(query);

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
  parseJobImage,
  getJob,
  listJobs,
  updateJob,
  sendJobEmail,
  retryJob,
  deleteJob,
};
