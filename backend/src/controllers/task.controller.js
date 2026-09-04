import { jobQueue } from "../queues/job.queue.js";
import Job from "../models/job.model.js";
import { NotFoundError } from "../utils/errors.js";

/**
 * Helper to serialize BullMQ job
 */
function serializeBullJob(job, state) {
  if (!job) return null;
  return {
    id: job.id,
    name: job.name,
    applicationId: job.data?.applicationId || null,
    state,
    attemptsMade: job.attemptsMade || 0,
    timestamp: job.timestamp,
    processedOn: job.processedOn || null,
    finishedOn: job.finishedOn || null,
    failedReason: job.failedReason || null,
    progress: job.progress || 0,
  };
}

/**
 * GET /api/tasks
 * Categorized BullMQ queue monitor tasks
 */
export async function getQueueTasks(req, res, next) {
  try {
    const [waitingJobs, activeJobs, completedJobs, failedJobs, delayedJobs] =
      await Promise.all([
        jobQueue.getWaiting(0, 30),
        jobQueue.getActive(0, 30),
        jobQueue.getCompleted(0, 30),
        jobQueue.getFailed(0, 30),
        jobQueue.getDelayed(0, 30),
      ]);

    // Attach application metadata to tasks
    const appIds = [
      ...waitingJobs,
      ...activeJobs,
      ...completedJobs,
      ...failedJobs,
      ...delayedJobs,
    ]
      .map((j) => j.data?.applicationId)
      .filter(Boolean);

    const applications = await Job.find({ jobId: { $in: appIds } })
      .select("jobId status parsedJob createdAt")
      .lean();

    const appMap = new Map(applications.map((a) => [a.jobId, a]));

    const formatWithApp = (jobs, state) =>
      jobs.map((j) => {
        const serialized = serializeBullJob(j, state);
        const app = appMap.get(serialized.applicationId);
        return {
          ...serialized,
          role: app?.parsedJob?.title || "Pending extraction...",
          company: app?.parsedJob?.company || "Pending...",
          appStatus: app?.status || state.toUpperCase(),
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          waiting: waitingJobs.length,
          active: activeJobs.length,
          completed: completedJobs.length,
          failed: failedJobs.length,
          delayed: delayedJobs.length,
          total:
            waitingJobs.length +
            activeJobs.length +
            completedJobs.length +
            failedJobs.length +
            delayedJobs.length,
        },
        tasks: {
          waiting: formatWithApp(waitingJobs, "waiting"),
          active: formatWithApp(activeJobs, "active"),
          completed: formatWithApp(completedJobs, "completed"),
          failed: formatWithApp(failedJobs, "failed"),
          delayed: formatWithApp(delayedJobs, "delayed"),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/tasks/:id
 * Retrieve details of a specific BullMQ task
 */
export async function getTaskById(req, res, next) {
  try {
    const { id } = req.params;
    const job = await jobQueue.getJob(id);

    if (!job) {
      throw new NotFoundError(`Queue task '${id}' not found.`);
    }

    const state = await job.getState();
    const serialized = serializeBullJob(job, state);

    let application = null;
    if (serialized.applicationId) {
      application = await Job.findOne({ jobId: serialized.applicationId }).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        task: serialized,
        application,
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getQueueTasks,
  getTaskById,
};
