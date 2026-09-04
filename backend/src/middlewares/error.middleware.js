import logger from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

/**
 * Centralized Express Error Handling Middleware.
 * Prevents leaking secrets, internal credentials, or stack traces in responses.
 */
export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
  const message = err.message || "Internal Server Error";

  logger.error(`Express Request Error [${req.method} ${req.originalUrl}]: ${message}`, {
    statusCode,
    stage: err.stage || null,
  });

  // Safe response format for clients
  const response = {
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred."
      : message,
  };

  if (err.stage) {
    response.stage = err.stage;
  }

  res.status(statusCode).json(response);
}

/**
 * 404 Route Not Found Handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export default {
  errorHandler,
  notFoundHandler,
};
