import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { ImapFlow } from "imapflow";
import config from "../config/config.js";
import logger from "../utils/logger.js";
import { PipelineError } from "../utils/errors.js";

/**
 * Downloads a resume PDF from a URL into a temporary local directory.
 *
 * @param {string} resumeUrl - S3 or Presigned URL of the resume
 * @param {string} applicationId - Job/Application ID
 * @returns {Promise<string>} Local file path to the downloaded PDF
 */
export async function downloadResumeFile(resumeUrl, applicationId) {
  const tempDir = path.join(os.tmpdir(), "applypilot", applicationId);
  await fs.promises.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, "Resume.pdf");

  logger.info("Downloading resume PDF to temporary path", {
    applicationId,
    stage: "COMPOSING_EMAIL",
    filePath,
  });

  try {
    const response = await axios.get(resumeUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    await fs.promises.writeFile(filePath, Buffer.from(response.data));
    return filePath;
  } catch (error) {
    logger.error(`Failed to download resume PDF: ${error.message}`, {
      applicationId,
      stage: "COMPOSING_EMAIL",
    });
    throw new PipelineError(
      "COMPOSING_EMAIL",
      `Failed to download resume file from ${resumeUrl}: ${error.message}`
    );
  }
}

/**
 * Removes temporary files created for an application.
 *
 * @param {string} applicationId
 */
export async function cleanupTemporaryFiles(applicationId) {
  try {
    const tempDir = path.join(os.tmpdir(), "applypilot", applicationId);
    await fs.promises.rm(tempDir, { recursive: true, force: true });
    logger.debug(`Cleaned up temporary directory for application ${applicationId}`);
  } catch (error) {
    logger.warn(`Failed to clean up temp files: ${error.message}`, {
      applicationId,
    });
  }
}

/**
 * Generates a stable RFC 5322 Message-ID for the email.
 *
 * @param {string} applicationId
 * @returns {string} Message-ID string
 */
export function generateMessageId(applicationId) {
  const domain =
    config.email.address.split("@")[1] ||
    config.email.smtp.host ||
    "applypilot.local";
  return `<applypilot-${applicationId}-${Date.now()}@${domain}>`;
}

/**
 * Compiles a full MIME message (headers, body, attachment) into a raw Buffer.
 *
 * @param {object} params
 * @param {string} params.from - Sender email
 * @param {string} params.to - Recipient recruiter email
 * @param {string} params.subject - Email subject
 * @param {string} params.text - Plain text content
 * @param {string} params.html - HTML formatted content
 * @param {string} params.messageId - Stable Message-ID
 * @param {string} [params.resumeFilePath] - Local path to resume PDF attachment
 * @returns {Promise<Buffer>} Complete RFC 5322 MIME message buffer
 */
export async function buildRawMimeMessage({
  from,
  to,
  subject,
  text,
  html,
  messageId,
  resumeFilePath,
}) {
  const senderFrom =
    from ||
    (config.email.name
      ? `"${config.email.name}" <${config.email.address}>`
      : config.email.address);

  const mailOptions = {
    from: senderFrom,
    to,
    subject,
    text,
    html,
    messageId,
    date: new Date(),
    headers: {
      "MIME-Version": "1.0",
      "X-Mailer": "ApplyPilot Automation Engine",
    },
    attachments: [],
  };

  if (resumeFilePath && fs.existsSync(resumeFilePath)) {
    mailOptions.attachments.push({
      filename: "Resume.pdf",
      path: resumeFilePath,
      contentType: "application/pdf",
    });
  }

  const composer = new MailComposer(mailOptions);

  return new Promise((resolve, reject) => {
    composer.compile().build((err, messageBuffer) => {
      if (err) {
        return reject(
          new PipelineError(
            "COMPOSING_EMAIL",
            `Failed to compile MIME message: ${err.message}`
          )
        );
      }
      resolve(messageBuffer);
    });
  });
}

/**
 * Sends a raw MIME message via any configured SMTP provider (Spacemail, Gmail, Outlook, Custom).
 *
 * @param {Buffer} rawMimeBuffer - The compiled MIME email buffer
 * @param {object} envelope - { from: string, to: string }
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<object>} SMTP send info
 */
export async function sendMimeViaSmtp(rawMimeBuffer, { from, to }, applicationId = null) {
  logger.info(`Sending application email via SMTP to ${to} (${config.email.smtp.host}:${config.email.smtp.port})`, {
    applicationId,
    stage: "SENDING_EMAIL",
  });

  const transporter = nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure, // true for 465, false for 587 / STARTTLS
    auth: {
      user: config.email.address,
      pass: config.email.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.sendMail({
      envelope: {
        from,
        to: [to],
      },
      raw: rawMimeBuffer,
    });

    logger.info("Successfully sent email via SMTP", {
      applicationId,
      stage: "SENDING_EMAIL",
      smtpMessageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error(`SMTP send failed: ${error.message}`, {
      applicationId,
      stage: "SENDING_EMAIL",
    });
    throw new PipelineError(
      "SENDING_EMAIL",
      `Failed to send email via SMTP (${config.email.smtp.host}): ${error.message}`
    );
  }
}

/**
 * Appends the exact same raw MIME message to the IMAP Sent folder of any email provider.
 * Supports Gmail, Outlook, Spacemail, Fastmail, Apple Mail, Zoho, Dovecot, Postfix, etc.
 *
 * @param {Buffer} rawMimeBuffer - The compiled MIME email buffer
 * @param {string} [applicationId] - Application ID for logging
 * @returns {Promise<object>} IMAP append result
 */
export async function appendMimeToSentFolder(rawMimeBuffer, applicationId = null) {
  // If IMAP synchronization is disabled, skip gracefully
  if (!config.email.imap.enabled) {
    logger.info("IMAP Sent-folder synchronization is disabled in config. Skipping.", {
      applicationId,
      stage: "SAVING_TO_SENT",
    });
    return { skipped: true };
  }

  logger.info(`Connecting to IMAP server (${config.email.imap.host}:${config.email.imap.port}) for Sent folder append`, {
    applicationId,
    stage: "SAVING_TO_SENT",
  });

  const client = new ImapFlow({
    host: config.email.imap.host,
    port: config.email.imap.port,
    secure: config.email.imap.secure,
    auth: {
      user: config.email.address,
      pass: config.email.password,
    },
    logger: false,
  });

  try {
    await client.connect();

    // 1. Discover the Sent mailbox dynamically across any provider
    const mailboxes = await client.list();
    let sentMailbox = null;

    // A. Check RFC 6154 special-use \Sent flag
    for (const mb of mailboxes) {
      if (
        mb.specialUse === "\\Sent" ||
        (Array.isArray(mb.specialUse) && mb.specialUse.includes("\\Sent"))
      ) {
        sentMailbox = mb;
        break;
      }
    }

    // B. Fallback to comprehensive provider naming patterns
    if (!sentMailbox) {
      const candidates = [
        "Sent",
        "Sent Items",
        "Sent Mail",
        "Sent Messages",
        "[Gmail]/Sent Mail",
        "[Google Mail]/Sent Mail",
        "INBOX.Sent",
        "INBOX/Sent",
        "Enviados",
        "Gesendet",
        "Messages envoyés",
      ];

      for (const candidate of candidates) {
        const found = mailboxes.find(
          (mb) =>
            mb.name.toLowerCase() === candidate.toLowerCase() ||
            mb.path.toLowerCase() === candidate.toLowerCase()
        );
        if (found) {
          sentMailbox = found;
          break;
        }
      }
    }

    // C. Default target path if none found
    const targetFolder = sentMailbox ? sentMailbox.path : "Sent";

    logger.debug(`Target IMAP Sent mailbox path resolved to: ${targetFolder}`, {
      applicationId,
    });

    // 2. Append the exact raw MIME email buffer with \Seen flag
    const result = await client.append(targetFolder, rawMimeBuffer, ["\\Seen"]);

    await client.logout();

    logger.info("Successfully appended MIME message to Sent folder via IMAP", {
      applicationId,
      stage: "SAVING_TO_SENT",
      folder: targetFolder,
    });

    return result;
  } catch (error) {
    try {
      await client.logout();
    } catch (_) {
      // Ignore logout error during cleanup
    }

    logger.error(`IMAP Sent-folder append failed: ${error.message}`, {
      applicationId,
      stage: "SAVING_TO_SENT",
    });

    throw new PipelineError(
      "SAVING_TO_SENT",
      `Failed to save email to Sent folder via IMAP (${config.email.imap.host}): ${error.message}`
    );
  }
}

export default {
  downloadResumeFile,
  cleanupTemporaryFiles,
  generateMessageId,
  buildRawMimeMessage,
  sendMimeViaSmtp,
  appendMimeToSentFolder,
};
