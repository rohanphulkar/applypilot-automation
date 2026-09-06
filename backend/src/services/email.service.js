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
 * @param {string} [customFilename] - Optional custom filename for attachment
 * @returns {Promise<string>} Local file path to the downloaded PDF
 */
export async function downloadResumeFile(resumeUrl, applicationId, customFilename = null) {
  const tempDir = path.join(os.tmpdir(), "applypilot", applicationId);
  await fs.promises.mkdir(tempDir, { recursive: true });

  // Resolve target filename from customFilename, URL query string (filename=...), or URL pathname
  let resolvedFilename = customFilename;
  if (!resolvedFilename && typeof resumeUrl === "string") {
    try {
      const parsedUrl = new URL(resumeUrl.startsWith("http") ? resumeUrl : `http://localhost/${resumeUrl}`);
      const queryMatch = parsedUrl.search.match(/filename(?:%3D|=)(?:%22|")?([^&"%]+)/i);
      if (queryMatch && queryMatch[1]) {
        resolvedFilename = decodeURIComponent(queryMatch[1]);
      } else {
        const base = path.basename(parsedUrl.pathname);
        if (base && base.toLowerCase().endsWith(".pdf")) {
          resolvedFilename = base;
        }
      }
    } catch {
      // Fallback
    }
  }

  if (!resolvedFilename) {
    resolvedFilename = "Rohan_Phulkar_Resume.pdf";
  }
  if (!path.extname(resolvedFilename)) {
    resolvedFilename += ".pdf";
  }

  const filePath = path.join(tempDir, resolvedFilename);

  // 1. Direct local file check
  if (typeof resumeUrl === "string" && fs.existsSync(resumeUrl) && fs.statSync(resumeUrl).isFile()) {
    logger.info("Resume file found directly on local disk", {
      applicationId,
      stage: "COMPOSING_EMAIL",
      resumeUrl,
    });
    await fs.promises.copyFile(resumeUrl, filePath);
    return filePath;
  }

  // 2. Resolve relative URL to absolute URL
  let targetUrl = resumeUrl;
  if (typeof resumeUrl === "string" && !resumeUrl.startsWith("http://") && !resumeUrl.startsWith("https://")) {
    const baseUrl = config.resumeApi.baseUrl.replace(/\/$/, "");
    targetUrl = `${baseUrl}/${resumeUrl.replace(/^\//, "")}`;
  }

  logger.info("Downloading resume PDF to temporary path", {
    applicationId,
    stage: "COMPOSING_EMAIL",
    targetUrl,
    filePath,
  });

  let lastError = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await axios.get(targetUrl, {
        responseType: "arraybuffer",
        timeout: 30000,
      });

      await fs.promises.writeFile(filePath, Buffer.from(response.data));
      logger.info("Successfully downloaded resume PDF attachment", {
        applicationId,
        stage: "COMPOSING_EMAIL",
        attempt,
        sizeBytes: response.data?.length || 0,
      });
      return filePath;
    } catch (error) {
      lastError = error;
      logger.warn(`Resume download attempt ${attempt}/${maxAttempts} failed: ${error.message}`, {
        applicationId,
        stage: "COMPOSING_EMAIL",
        targetUrl,
      });
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  logger.error(`Failed to download resume PDF after ${maxAttempts} attempts: ${lastError?.message}`, {
    applicationId,
    stage: "COMPOSING_EMAIL",
    targetUrl,
  });

  throw new PipelineError(
    "COMPOSING_EMAIL",
    `Failed to download resume file from ${targetUrl}: ${lastError?.message}`
  );
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
  attachments = [],
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

  // Add individual resumeFilePath if provided
  if (resumeFilePath && fs.existsSync(resumeFilePath)) {
    const finalFilename = path.basename(resumeFilePath) || "Rohan_Phulkar_Resume.pdf";
    mailOptions.attachments.push({
      filename: finalFilename,
      path: resumeFilePath,
      contentType: finalFilename.endsWith(".docx")
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
    });
  }

  // Add custom attachments array
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      if (att && att.path && fs.existsSync(att.path)) {
        mailOptions.attachments.push({
          filename: att.filename || path.basename(att.path),
          path: att.path,
          contentType: att.contentType || (att.filename?.endsWith(".docx")
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf"),
        });
      }
    }
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
 * Creates a configured Nodemailer SMTP transporter with hardened timeouts and IPv4 preference.
 *
 * @returns {import('nodemailer').Transporter}
 */
export function createSmtpTransporter() {
  return nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.secure, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: {
      user: config.email.address,
      pass: config.email.password,
    },
    // Prevent VPS hangs: strict timeouts for connection, greeting, and socket inactivity
    connectionTimeout: config.email.smtp.connectionTimeout || 15000,
    greetingTimeout: config.email.smtp.greetingTimeout || 15000,
    socketTimeout: config.email.smtp.socketTimeout || 30000,
    dnsTimeout: 10000,
    // IPv4 preference (family 4) prevents Linux VPS dual-stack DNS resolution from hanging on dead IPv6 routes
    family: config.email.smtp.family || 4,
    tls: {
      rejectUnauthorized: false,
      servername: config.email.smtp.host,
      minVersion: "TLSv1.2",
    },
    pool: false,
  });
}

/**
 * Creates a configured ImapFlow client with hardened timeouts and safe TLS options.
 *
 * @returns {ImapFlow}
 */
export function createImapClient() {
  return new ImapFlow({
    host: config.email.imap.host,
    port: config.email.imap.port,
    secure: config.email.imap.secure, // true for 993, false for 143
    auth: {
      user: config.email.address,
      pass: config.email.password,
    },
    // Prevent VPS hangs: strict timeouts for IMAP connect and socket operations
    connectionTimeout: config.email.imap.connectionTimeout || 15000,
    greetingTimeout: config.email.imap.greetingTimeout || 15000,
    socketTimeout: config.email.imap.socketTimeout || 30000,
    tls: {
      rejectUnauthorized: false,
      servername: config.email.imap.host,
      minVersion: "TLSv1.2",
    },
    logger: false,
    emitLogs: false,
  });
}

/**
 * Helper to run a promise with an overarching hard timeout safeguard.
 */
function withTimeout(promise, ms, operationName) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
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
  logger.info(
    `Sending application email via SMTP to ${to} (${config.email.smtp.host}:${config.email.smtp.port}, secure=${config.email.smtp.secure})`,
    {
      applicationId,
      stage: "SENDING_EMAIL",
      smtpHost: config.email.smtp.host,
      smtpPort: config.email.smtp.port,
      smtpSecure: config.email.smtp.secure,
    }
  );

  const transporter = createSmtpTransporter();

  try {
    const sendPromise = transporter.sendMail({
      envelope: {
        from: from || config.email.address,
        to: [to],
      },
      raw: rawMimeBuffer,
    });

    // Guard with a 45-second overall hard timeout to guarantee the worker never hangs
    const info = await withTimeout(
      sendPromise,
      45000,
      `SMTP send to ${config.email.smtp.host}:${config.email.smtp.port}`
    );

    logger.info("Successfully sent email via SMTP", {
      applicationId,
      stage: "SENDING_EMAIL",
      smtpMessageId: info.messageId,
      response: info.response,
    });

    return info;
  } catch (error) {
    logger.error(`SMTP send failed: ${error.message}`, {
      applicationId,
      stage: "SENDING_EMAIL",
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      code: error.code,
    });
    throw new PipelineError(
      "SENDING_EMAIL",
      `Failed to send email via SMTP (${config.email.smtp.host}:${config.email.smtp.port}): ${error.message}`
    );
  } finally {
    try {
      transporter.close();
    } catch (_) {
      // Ignore transporter close errors
    }
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

  logger.info(
    `Connecting to IMAP server (${config.email.imap.host}:${config.email.imap.port}, secure=${config.email.imap.secure}) for Sent folder append`,
    {
      applicationId,
      stage: "SAVING_TO_SENT",
    }
  );

  const client = createImapClient();

  const imapOperation = async () => {
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
            mb.name?.toLowerCase() === candidate.toLowerCase() ||
            mb.path?.toLowerCase() === candidate.toLowerCase()
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

    logger.info("Successfully appended MIME message to Sent folder via IMAP", {
      applicationId,
      stage: "SAVING_TO_SENT",
      folder: targetFolder,
    });

    return result;
  };

  try {
    // Guard with a 35-second overall hard timeout to guarantee worker never hangs
    return await withTimeout(
      imapOperation(),
      35000,
      `IMAP append to ${config.email.imap.host}:${config.email.imap.port}`
    );
  } catch (error) {
    logger.error(`IMAP Sent-folder append failed: ${error.message}`, {
      applicationId,
      stage: "SAVING_TO_SENT",
      host: config.email.imap.host,
      port: config.email.imap.port,
    });

    throw new PipelineError(
      "SAVING_TO_SENT",
      `Failed to save email to Sent folder via IMAP (${config.email.imap.host}): ${error.message}`
    );
  } finally {
    // Force close IMAP socket immediately to prevent lingering connections on VPS
    try {
      client.close();
    } catch (_) {
      // Ignore cleanup error
    }
  }
}

/**
 * Diagnostics: Verifies SMTP credentials and connection handshake.
 *
 * @returns {Promise<{ ok: boolean, latencyMs: number, message: string, error?: string }>}
 */
export async function verifySmtpConnection() {
  const startTime = Date.now();
  const transporter = createSmtpTransporter();

  try {
    const verifyPromise = transporter.verify();
    await withTimeout(verifyPromise, 15000, "SMTP verify connection");
    const latencyMs = Date.now() - startTime;
    return {
      ok: true,
      latencyMs,
      message: `SMTP connection and authentication succeeded in ${latencyMs}ms (${config.email.smtp.host}:${config.email.smtp.port})`,
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      message: `SMTP connection failed after ${latencyMs}ms: ${error.message}`,
      error: error.message,
      host: config.email.smtp.host,
      port: config.email.smtp.port,
      secure: config.email.smtp.secure,
    };
  } finally {
    try {
      transporter.close();
    } catch (_) {}
  }
}

/**
 * Diagnostics: Verifies IMAP credentials, connection, and discovers Sent folder.
 *
 * @returns {Promise<{ ok: boolean, latencyMs: number, message: string, sentFolder?: string, error?: string }>}
 */
export async function verifyImapConnection() {
  if (!config.email.imap.enabled) {
    return {
      ok: true,
      skipped: true,
      message: "IMAP is disabled in configuration.",
    };
  }

  const startTime = Date.now();
  const client = createImapClient();

  try {
    const checkOp = async () => {
      await client.connect();
      const mailboxes = await client.list();
      let sentMailboxName = "Sent";
      for (const mb of mailboxes) {
        if (
          mb.specialUse === "\\Sent" ||
          (Array.isArray(mb.specialUse) && mb.specialUse.includes("\\Sent"))
        ) {
          sentMailboxName = mb.path || mb.name;
          break;
        }
      }
      return {
        mailboxesCount: mailboxes.length,
        sentFolder: sentMailboxName,
      };
    };

    const details = await withTimeout(checkOp(), 15000, "IMAP verify connection");
    const latencyMs = Date.now() - startTime;

    return {
      ok: true,
      latencyMs,
      message: `IMAP connection and authentication succeeded in ${latencyMs}ms (${config.email.imap.host}:${config.email.imap.port})`,
      host: config.email.imap.host,
      port: config.email.imap.port,
      secure: config.email.imap.secure,
      sentFolder: details.sentFolder,
      mailboxesCount: details.mailboxesCount,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      ok: false,
      latencyMs,
      message: `IMAP connection failed after ${latencyMs}ms: ${error.message}`,
      error: error.message,
      host: config.email.imap.host,
      port: config.email.imap.port,
      secure: config.email.imap.secure,
    };
  } finally {
    try {
      client.close();
    } catch (_) {}
  }
}

export default {
  downloadResumeFile,
  cleanupTemporaryFiles,
  generateMessageId,
  buildRawMimeMessage,
  createSmtpTransporter,
  createImapClient,
  sendMimeViaSmtp,
  appendMimeToSentFolder,
  verifySmtpConnection,
  verifyImapConnection,
};
