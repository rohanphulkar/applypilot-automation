import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Centralized Application Configuration
 * All environment variables are parsed, validated with fallbacks, and exported from this single file.
 */
const config = {
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || "5000", 10),
    env: process.env.NODE_ENV || "development",
  },

  // MongoDB connection settings
  mongodb: {
    uri:
      process.env.MONGODB_URI ||
      process.env.MONGO_URI ||
      "mongodb://localhost:27017/applypilot",
  },

  // Redis configuration for BullMQ
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null, // Required by BullMQ
  },

  // OpenAI settings
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
  },

  // Resume API settings
  resumeApi: {
    baseUrl: process.env.RESUME_API_BASE_URL || "http://localhost:8000",
    apiKey: process.env.RESUME_API_KEY || "",
    endpoint: process.env.RESUME_API_ENDPOINT || "/api/resume/tailor",
  },

  // Universal Email Provider Configuration (Works with any provider: Gmail, Outlook, Spacemail, Custom, etc.)
  email: {
    name: process.env.EMAIL_NAME || process.env.EMAIL_FROM_NAME || "Rohan Phulkar",
    address:
      process.env.EMAIL_USER ||
      process.env.SMTP_USER ||
      process.env.SPACEMAIL_EMAIL ||
      "",
    password:
      process.env.EMAIL_PASS ||
      process.env.SMTP_PASS ||
      process.env.SPACEMAIL_PASSWORD ||
      "",

    smtp: {
      host:
        process.env.SMTP_HOST ||
        process.env.SPACEMAIL_SMTP_HOST ||
        "mail.spacemail.com",
      port: parseInt(
        process.env.SMTP_PORT || process.env.SPACEMAIL_SMTP_PORT || "465",
        10
      ),
      secure:
        process.env.SMTP_SECURE !== undefined
          ? process.env.SMTP_SECURE === "true"
          : process.env.SPACEMAIL_SMTP_SECURE !== undefined
          ? process.env.SPACEMAIL_SMTP_SECURE === "true"
          : true,
    },

    imap: {
      enabled:
        process.env.IMAP_ENABLED !== undefined
          ? process.env.IMAP_ENABLED === "true"
          : true,
      host:
        process.env.IMAP_HOST ||
        process.env.SPACEMAIL_IMAP_HOST ||
        "mail.spacemail.com",
      port: parseInt(
        process.env.IMAP_PORT || process.env.SPACEMAIL_IMAP_PORT || "993",
        10
      ),
      secure:
        process.env.IMAP_SECURE !== undefined
          ? process.env.IMAP_SECURE === "true"
          : process.env.SPACEMAIL_IMAP_SECURE !== undefined
          ? process.env.SPACEMAIL_IMAP_SECURE === "true"
          : true,
    },
  },

  // BullMQ Worker configuration
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "3", 10),
    attempts: parseInt(process.env.WORKER_ATTEMPTS || "3", 10),
    backoffDelay: parseInt(process.env.WORKER_BACKOFF_DELAY || "5000", 10),
  },
};

export default config;
