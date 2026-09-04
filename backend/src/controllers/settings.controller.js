import mongoose from "mongoose";
import config from "../config/config.js";
import { redisConnection } from "../queues/job.queue.js";

/**
 * GET /api/settings
 * Returns sanitized system configuration, connection health, and worker settings.
 */
export async function getSettings(req, res, next) {
  try {
    const mongoStatus =
      mongoose.connection.readyState === 1
        ? "connected"
        : mongoose.connection.readyState === 2
        ? "connecting"
        : "disconnected";

    let redisStatus = "disconnected";
    try {
      if (redisConnection.status === "ready" || redisConnection.status === "connect") {
        await redisConnection.ping();
        redisStatus = "connected";
      }
    } catch (_) {
      redisStatus = "disconnected";
    }

    return res.status(200).json({
      success: true,
      data: {
        server: {
          port: config.server.port,
          env: config.server.env,
          nodeVersion: process.version,
          uptimeSeconds: Math.floor(process.uptime()),
        },
        database: {
          status: mongoStatus,
          host: mongoose.connection.host || "localhost",
          name: mongoose.connection.name || "applypilot",
        },
        redis: {
          status: redisStatus,
          host: config.redis.host,
          port: config.redis.port,
        },
        openai: {
          configured: Boolean(config.openai.apiKey && config.openai.apiKey.trim()),
          model: config.openai.model,
        },
        resumeApi: {
          configured: Boolean(config.resumeApi.baseUrl),
          baseUrl: config.resumeApi.baseUrl,
          endpoint: config.resumeApi.endpoint,
        },
        email: {
          configured: Boolean(config.email.address && config.email.password),
          displayName: config.email.name || "Rohan Phulkar",
          address: config.email.address || "Not configured",
          fromFormatted: config.email.name
            ? `"${config.email.name}" <${config.email.address}>`
            : config.email.address,
          providerHint: config.email.smtp.host.includes("spacemail")
            ? "Spacemail"
            : config.email.smtp.host.includes("gmail")
            ? "Google / Gmail"
            : config.email.smtp.host.includes("office365") || config.email.smtp.host.includes("outlook")
            ? "Microsoft Outlook / 365"
            : config.email.smtp.host.includes("zoho")
            ? "Zoho Mail"
            : "Custom SMTP / IMAP",
          smtp: {
            host: config.email.smtp.host,
            port: config.email.smtp.port,
            secure: config.email.smtp.secure,
          },
          imap: {
            enabled: config.email.imap.enabled,
            host: config.email.imap.host,
            port: config.email.imap.port,
            secure: config.email.imap.secure,
          },
        },
        worker: {
          concurrency: config.worker.concurrency,
          attempts: config.worker.attempts,
          backoffDelay: config.worker.backoffDelay,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /health
 * Extended health check endpoint
 */
export async function getHealthStatus(req, res) {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    await redisConnection.ping();
    redisOk = true;
  } catch (_) {
    redisOk = false;
  }

  const allHealthy = mongoOk && redisOk;

  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    service: "ApplyPilot Backend",
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: mongoOk ? "connected" : "disconnected",
      redis: redisOk ? "connected" : "disconnected",
      openai: Boolean(config.openai.apiKey) ? "configured" : "missing_key",
    },
  });
}

export default {
  getSettings,
  getHealthStatus,
};
