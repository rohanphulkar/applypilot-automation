/**
 * Custom application errors for ApplyPilot.
 */

export class AppError extends Error {
  /**
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 500)
   * @param {string} [stage] - Optional pipeline stage where error occurred
   */
  constructor(message, statusCode = 500, stage = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.stage = stage;
    this.isOperational = true; // Distinguishes operational errors from programming bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

export class PipelineError extends AppError {
  /**
   * @param {string} stage - The pipeline stage that failed (e.g. PARSING_JOB, SENDING_EMAIL)
   * @param {string} message - The failure reason
   */
  constructor(stage, message) {
    super(message, 500, stage);
  }
}
