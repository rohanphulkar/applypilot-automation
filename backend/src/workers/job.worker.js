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
 * Core application processor function.
 * Orchestrates all stages idempotently.
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

  // If already completed, nothing to do
  if (job.status === "COMPLETED") {
    logger.info("Job already completed. Skipping.", { applicationId });
    return;
  }

  let resumeFilePath = null;

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

    // Check recruiter email requirement
    if (!job.parsedJob.applicationEmail) {
      const errorMsg = "No application email was found in the job description.";
      logger.warn(errorMsg, {
        applicationId,
        stage: "PARSING_JOB",
      });

      job.status = "FAILED";
      job.processing.currentStage = "PARSING_JOB";
      job.error = {
        stage: "PARSING_JOB",
        message: errorMsg,
      };
      job.timeline.push({
        stage: "PARSING_JOB",
        status: "FAILED",
        message: errorMsg,
        createdAt: new Date(),
      });
      await job.save();
      // Do not throw so BullMQ doesn't retry missing email
      return;
    }

    // 4. Stage 2: Resume Tailoring via Resume API (35%)
    if (job.resume.requestStatus !== "COMPLETED") {
      await updateJobProgress(
        job,
        "TAILORING_RESUME",
        35,
        "STARTED",
        "Requesting ATS-tailored resume generation from Resume API"
      );

      const resumeResult = await tailorResume(
        job.originalJobDescription,
        applicationId
      );

      job.resume.urls = resumeResult.urls;
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

    // 6. Stage 4: Email Composition & Stable Message-ID (70%)
    job.email.recruiterEmail = job.parsedJob.applicationEmail;
    job.email.subject = `Application for ${job.parsedJob.title || "Position"}${
      job.parsedJob.company ? " - " + job.parsedJob.company : ""
    }`;
    job.email.body = job.coverLetter.content;

    if (!job.email.messageId) {
      job.email.messageId = generateMessageId(applicationId);
    }
    await updateJobProgress(
      job,
      "COMPOSING_EMAIL",
      70,
      "STARTED",
      `Composing application email to ${job.email.recruiterEmail}`
    );

    // Download primary resume PDF for email attachment if available
    const primaryResumeUrl = job.resume.urls?.[0];
    if (primaryResumeUrl) {
      resumeFilePath = await downloadResumeFile(primaryResumeUrl, applicationId);
    }

    // Convert plain text cover letter into clean HTML email body
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #222;">
        ${job.coverLetter.content
          .split("\n\n")
          .map((para) => `<p style="margin-bottom: 16px;">${para.replace(/\n/g, "<br/>")}</p>`)
          .join("")}
      </div>
    `.trim();

    // Format sender with display name (e.g. "Rohan Phulkar" <hello@rohanphulkar.com>)
    const senderFrom = config.email.name
      ? `"${config.email.name}" <${config.email.address}>`
      : config.email.address;

    // Build the complete RFC 5322 MIME message
    const rawMimeBuffer = await buildRawMimeMessage({
      from: senderFrom,
      to: job.email.recruiterEmail,
      subject: job.email.subject,
      text: job.email.body,
      html: htmlBody,
      messageId: job.email.messageId,
      resumeFilePath,
    });

    job.timeline.push({
      stage: "COMPOSING_EMAIL",
      status: "COMPLETED",
      message: `Compiled RFC 5322 MIME email message (ID: ${job.email.messageId})`,
      createdAt: new Date(),
    });
    await job.save();

    // 7. Stage 5: Send MIME via SMTP (85%) (Idempotent: skip if already SENT)
    if (job.email.smtpStatus !== "SENT") {
      await updateJobProgress(
        job,
        "SENDING_EMAIL",
        85,
        "STARTED",
        `Dispatching email via SMTP (${config.email.smtp.host}) to ${job.email.recruiterEmail}`
      );

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
    } else {
      logger.info(
        "SMTP email was already sent in previous attempt; skipping resend.",
        { applicationId }
      );
    }

    // 8. Stage 6: Append Exact MIME to IMAP Sent folder (95%) (Idempotent: skip if already SAVED)
    if (job.email.sentFolderStatus !== "SAVED" && job.email.sentFolderStatus !== "SKIPPED") {
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
    } else {
      logger.info(
        "Email was already appended to Sent folder in previous attempt; skipping.",
        { applicationId }
      );
    }

    // 9. Stage 7: Cleanup & Mark Completed (100%)
    await cleanupTemporaryFiles(applicationId);

    job.status = "COMPLETED";
    job.processing.currentStage = "COMPLETED";
    job.processing.progress = 100;
    job.processing.completedAt = new Date();
    job.error = { stage: null, message: null };
    job.timeline.push({
      stage: "COMPLETED",
      status: "COMPLETED",
      message: "Application pipeline finished successfully!",
      createdAt: new Date(),
    });
    await job.save();

    logger.info("Job application pipeline finished successfully!", {
      applicationId,
      status: "COMPLETED",
    });
  } catch (error) {
    // Clean up temporary files on error
    await cleanupTemporaryFiles(applicationId);

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

    // Re-throw so BullMQ triggers retry / backoff
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
};
