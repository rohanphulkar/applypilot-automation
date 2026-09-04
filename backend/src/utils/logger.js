/**
 * Clean structured logger for ApplyPilot.
 * Safely formats logs with timestamps, levels, application IDs, and processing stages.
 * Automatically redacts sensitive fields like passwords, tokens, and API keys.
 */

// Helper to sanitize objects if passed in metadata
function sanitize(obj) {
  if (!obj || typeof obj !== "object") return obj;

  const SENSITIVE_KEYS = [
    "password",
    "apikey",
    "api_key",
    "secret",
    "token",
    "authorization",
    "auth",
  ];

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const tags = [];

  if (meta.applicationId) {
    tags.push(`[applicationId=${meta.applicationId}]`);
  }
  if (meta.stage) {
    tags.push(`[stage=${meta.stage}]`);
  }
  if (meta.status) {
    tags.push(`[status=${meta.status}]`);
  }

  const tagPrefix = tags.length > 0 ? `${tags.join(" ")} ` : "";
  const extra = { ...meta };
  delete extra.applicationId;
  delete extra.stage;
  delete extra.status;

  const extraStr =
    Object.keys(extra).length > 0 ? ` | ${JSON.stringify(sanitize(extra))}` : "";

  return `[${timestamp}] [${level}] ${tagPrefix}${message}${extraStr}`;
}

export const logger = {
  info: (message, meta) => {
    console.log(formatLog("INFO", message, meta));
  },
  warn: (message, meta) => {
    console.warn(formatLog("WARN", message, meta));
  },
  error: (message, meta) => {
    console.error(formatLog("ERROR", message, meta));
  },
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("DEBUG", message, meta));
    }
  },
};

export default logger;
