import { Worker } from "bullmq";
import IORedis from "ioredis";
import config from "../config/config.js";
import Job from "../models/job.model.js";
import logger from "../utils/logger.js";
import { parseJobDescription } from "../services/job-parser.service.js";
import { tailorResume } from "../services/resume.service.js";
import { generateCoverLetter } from "../services/cover-letter.service.js";
import {
  downloadResumeFile,
  cleanupTemporaryFiles,
  generateMessageId,
  buildRawMimeMessage,
  sendMimeViaSmtp,
  appendMimeToSentFolder,
} from "../services/email.service.js";

/**
 * Worker connection instance to Redis
 */
export const workerRedisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  password: config.redis.password,
  maxRetriesPerRequest: null,
});

/**
 * Helper to update stage, progress, and push timeline events
 */
async function updateJobProgress(job, stage, progress, status, message) {
  job.status = stage;
  job.processing.currentStage = stage;
  job.processing.progress = progress;
  if (!job.processing.startedAt) {
    job.processing.startedAt = new Date();
  }

  job.timeline.push({
    stage,
    status,
    message,
    createdAt: new Date(),
  });

  await job.save();
}

/**
 * Executes manual email sending pipeline upon user approval.
 *
 * @param {string} applicationId
 * @param {string} [userId]
 * @param {object} [customOverrides] - Optional custom edited fields (subject, body, recruiterEmail)
 */
export async function sendApplicationEmailPipeline(applicationId, userId = null, customOverrides = {}) {
  const isObjectId = typeof applicationId === "string" && /^[0-9a-fA-F]{24}$/.test(applicationId);
  const query = {
    $or: [
      { jobId: applicationId },
      ...(isObjectId ? [{ _id: applicationId }] : []),
    ],
  };
  if (userId) {
    query.$or = [
      { jobId: applicationId, userId },
      { jobId: applicationId, userId: "user_demo_applypilot" },
      ...(isObjectId
        ? [{ _id: applicationId, userId }, { _id: applicationId, userId: "user_demo_applypilot" }]
        : []),
    ];
  }

  const job = await Job.findOne(query);
  if (!job) {
    throw new Error(`Job application with ID '${applicationId}' not found.`);
  }

  // Allow custom overrides from user edit before sending
  if (customOverrides.subject) job.email.subject = customOverrides.subject.trim();
  if (customOverrides.body) {
    job.email.body = customOverrides.body;
    job.coverLetter.content = customOverrides.body;
  }
  if (customOverrides.recruiterEmail) {
    job.email.recruiterEmail = customOverrides.recruiterEmail.trim().toLowerCase();
  }

  if (!job.email.recruiterEmail) {
    throw new Error("Cannot send email: No recipient email address provided.");
  }

  let resumeFilePath = null;

  try {
    // 1. Update progress to SENDING_EMAIL (85%)
    await updateJobProgress(
      job,
      "SENDING_EMAIL",
      85,
      "STARTED",
      `Dispatching approved application email to ${job.email.recruiterEmail}`
    );

    // Download primary resume PDF for email attachment if available
    const primaryResumeUrl = job.resume?.urls?.[0];
    if (primaryResumeUrl) {
      resumeFilePath = await downloadResumeFile(
        primaryResumeUrl,
        applicationId,
        job.resume?.filename ? `${job.resume.filename}.pdf` : null
      );
    }

    if (!job.email.messageId) {
      job.email.messageId = generateMessageId(applicationId);
    }

    // Convert plain text body into clean HTML email body
    const textBody = job.email.body || job.coverLetter?.content || "";
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
        ${textBody
          .split("\n\n")
          .map((para) => `<p style="margin-bottom: 16px;">${para.replace(/\n/g, "<br/>")}</p>`)
          .join("")}
      </div>
    `.trim();

    // Format sender with display name
    const senderFrom = config.email.name
      ? `"${config.email.name}" <${config.email.address}>`
      : config.email.address;

    // Build the complete RFC 5322 MIME message
    const rawMimeBuffer = await buildRawMimeMessage({
      from: senderFrom,
      to: job.email.recruiterEmail,
      subject: job.email.subject || "Job Application",
      text: textBody,
      html: htmlBody,
      messageId: job.email.messageId,
      resumeFilePath,
    });

    // Send via SMTP
    await sendMimeViaSmtp(
      rawMimeBuffer,
      {
        from: config.email.address,
        to: job.email.recruiterEmail,
      },
      applicationId
    );

    job.email.smtpStatus = "SENT";
    job.email.sentAt = new Date();
    job.timeline.push({
      stage: "SENDING_EMAIL",
      status: "COMPLETED",
      message: `Email successfully delivered via SMTP to ${job.email.recruiterEmail}`,
      createdAt: new Date(),
    });
    await job.save();

    // Append to IMAP Sent folder
    await updateJobProgress(
      job,
      "SAVING_TO_SENT",
      95,
      "STARTED",
      "Synchronizing email into IMAP Sent folder"
    );

    const imapResult = await appendMimeToSentFolder(rawMimeBuffer, applicationId);

    if (imapResult?.skipped) {
      job.email.sentFolderStatus = "SKIPPED";
      job.timeline.push({
        stage: "SAVING_TO_SENT",
        status: "SKIPPED",
        message: "IMAP Sent-folder synchronization is disabled in settings",
        createdAt: new Date(),
      });
    } else {
      job.email.sentFolderStatus = "SAVED";
      job.timeline.push({
        stage: "SAVING_TO_SENT",
        status: "COMPLETED",
        message: "Exact MIME message appended to Sent folder via IMAP",
        createdAt: new Date(),
      });
    }
    await job.save();

    // Cleanup & Mark COMPLETED (100%)
    await cleanupTemporaryFiles(applicationId);

    job.status = "COMPLETED";
    job.processing.currentStage = "COMPLETED";
    job.processing.progress = 100;
    job.processing.completedAt = new Date();
    job.error = { stage: null, message: null };
    job.timeline.push({
      stage: "COMPLETED",
      status: "COMPLETED",
      message: "Application pipeline finished successfully and email delivered!",
      createdAt: new Date(),
    });
    await job.save();

    return job;
  } catch (error) {
    await cleanupTemporaryFiles(applicationId);
    job.status = "FAILED";
    job.error = {
      stage: "SENDING_EMAIL",
      message: error.message,
    };
    job.timeline.push({
      stage: "SENDING_EMAIL",
      status: "FAILED",
      message: `Failed to send email: ${error.message}`,
      createdAt: new Date(),
    });
    await job.save();
    throw error;
  }
}

/**
 * Core application processor function.
 * Orchestrates parsing, resume tailoring, and cover letter generation, then pauses for manual user review.
 *
 * @param {import('bullmq').Job} bullmqJob
 */
export async function processApplicationJob(bullmqJob) {
  const { applicationId } = bullmqJob.data;

  logger.info("Processing application job", {
    applicationId,
    bullmqJobId: bullmqJob.id,
    attempt: bullmqJob.attemptsMade + 1,
  });

  // 1. Load application record from MongoDB
  const job = await Job.findOne({ jobId: applicationId });
  if (!job) {
    logger.error(`Application with jobId=${applicationId} not found in MongoDB.`);
    return;
  }

  // If already completed or ready for review, nothing to do
  if (job.status === "COMPLETED" || job.status === "READY_FOR_REVIEW") {
    logger.info("Job already completed or awaiting review. Skipping.", { applicationId });
    return;
  }

  try {
    // 2. Set overall status to PROCESSING
    if (job.status === "QUEUED") {
      await updateJobProgress(
        job,
        "PROCESSING",
        5,
        "STARTED",
        "Background worker picked up application task"
      );
    }

    // 3. Stage 1: Parse Job Description (15%)
    if (!job.parsedJob || !job.parsedJob.title) {
      await updateJobProgress(
        job,
        "PARSING_JOB",
        15,
        "STARTED",
        "Parsing structured job details and contact email with OpenAI"
      );

      const parsedData = await parseJobDescription(
        job.originalJobDescription,
        applicationId
      );

      job.parsedJob = parsedData;
      job.timeline.push({
        stage: "PARSING_JOB",
        status: "COMPLETED",
        message: `Extracted role: ${parsedData.title || "Unknown"} at ${parsedData.company || "Unknown"}`,
        createdAt: new Date(),
      });
      await job.save();
    }

    // 4. Stage 2: Resume Tailoring via Resume API (35%)
    if (job.resume.requestStatus !== "COMPLETED") {
      await updateJobProgress(
        job,
        "TAILORING_RESUME",
        35,
        "STARTED",
        "Requesting ATS-tailored resume generation adhering to ATS guidelines"
      );

      const resumeResult = await tailorResume(
        job.originalJobDescription,
        applicationId
      );

      job.resume.urls = resumeResult.urls;
      if (resumeResult.filename) {
        job.resume.filename = resumeResult.filename;
      }
      job.resume.requestStatus = "COMPLETED";
      job.timeline.push({
        stage: "TAILORING_RESUME",
        status: "COMPLETED",
        message: `Generated ${resumeResult.urls.length} tailored resume format(s)`,
        createdAt: new Date(),
      });
      await job.save();
    }

    // 5. Stage 3: Cover Letter Generation (55%)
    if (job.coverLetter.status !== "COMPLETED") {
      await updateJobProgress(
        job,
        "GENERATING_COVER_LETTER",
        55,
        "STARTED",
        "Crafting tailored executive cover letter with OpenAI"
      );

      const coverLetterText = await generateCoverLetter(
        {
          parsedJob: job.parsedJob,
          originalJobDescription: job.originalJobDescription,
          applicantName: config.email.name || "Rohan Phulkar",
        },
        applicationId
      );

      job.coverLetter.content = coverLetterText;
      job.coverLetter.status = "COMPLETED";
      job.timeline.push({
        stage: "GENERATING_COVER_LETTER",
        status: "COMPLETED",
        message: "Cover letter successfully generated and formatted",
        createdAt: new Date(),
      });
      await job.save();
    }

    // 6. Stage 4: Email Draft Composition & Stable Message-ID (70%)
    job.email.recruiterEmail = job.parsedJob?.applicationEmail || "";
    job.email.subject = `Application for ${job.parsedJob?.title || "Position"}${
      job.parsedJob?.company ? " - " + job.parsedJob.company : ""
    }`;
    job.email.body = job.coverLetter.content;

    if (!job.email.messageId) {
      job.email.messageId = generateMessageId(applicationId);
    }

    // 7. Transition to READY_FOR_REVIEW for manual user review & approval!
    job.status = "READY_FOR_REVIEW";
    job.processing.currentStage = "READY_FOR_REVIEW";
    job.processing.progress = 70;
    job.timeline.push({
      stage: "READY_FOR_REVIEW",
      status: "READY_FOR_REVIEW",
      message: "Resume tailored and cover letter drafted. Awaiting user review, tailoring edits, and manual approval to send.",
      createdAt: new Date(),
    });
    await job.save();

    logger.info("Job application reached READY_FOR_REVIEW state", {
      applicationId,
      status: "READY_FOR_REVIEW",
    });
  } catch (error) {
    const stage = error.stage || job.status || "PROCESSING";
    const errorMessage = error.message || "An unexpected error occurred.";

    logger.error(`Job processing failed at stage [${stage}]: ${errorMessage}`, {
      applicationId,
      stage,
    });

    // Persist error details in MongoDB
    job.status = "FAILED";
    job.processing.currentStage = stage;
    job.error = {
      stage,
      message: errorMessage,
    };
    job.timeline.push({
      stage,
      status: "FAILED",
      message: `Error at [${stage}]: ${errorMessage}`,
      createdAt: new Date(),
    });
    await job.save();

    throw error;
  }
}

/**
 * Initializes and starts the BullMQ worker instance
 */
export function startJobWorker() {
  const worker = new Worker("job-application", processApplicationJob, {
    connection: workerRedisConnection,
    concurrency: config.worker.concurrency,
  });

  worker.on("ready", () => {
    logger.info(`BullMQ Worker ready (Concurrency: ${config.worker.concurrency})`);
  });

  worker.on("completed", (job) => {
    logger.info(`BullMQ Job ${job.id} completed.`, {
      bullmqJobId: job.id,
      applicationId: job.data.applicationId,
    });
  });

  worker.on("failed", (job, err) => {
    logger.error(`BullMQ Job ${job?.id} failed: ${err.message}`, {
      bullmqJobId: job?.id,
      applicationId: job?.data?.applicationId,
    });
  });

  worker.on("error", (err) => {
    logger.error(`BullMQ Worker internal error: ${err.message}`);
  });

  return worker;
}

export default {
  startJobWorker,
  processApplicationJob,
  sendApplicationEmailPipeline,
};
