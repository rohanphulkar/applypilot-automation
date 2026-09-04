import { Queue } from "bullmq";
import IORedis from "ioredis";
import config from "../config/config.js";
import logger from "../utils/logger.js";

/**
 * Shared Redis connection instance for BullMQ Queue
 */
export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  username: config.redis.username,
  password: config.redis.password,
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on("connect", () => {
  logger.info("Connected to Redis for BullMQ Queue");
});

redisConnection.on("error", (err) => {
  logger.error(`Redis connection error: ${err.message}`);
});

/**
 * BullMQ Queue: 'job-application'
 */
export const jobQueue = new Queue("job-application", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: config.worker.attempts,
    backoff: {
      type: "exponential",
      delay: config.worker.backoffDelay,
    },
    removeOnComplete: {
      count: 1000,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 5000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
});

/**
 * Helper to add a job to the BullMQ queue with only the applicationId.
 *
 * @param {string} applicationId - Unique jobId from MongoDB
 * @returns {Promise<import('bullmq').Job>}
 */
export async function addJobToQueue(applicationId) {
  const job = await jobQueue.add("process-application", {
    applicationId,
  });

  logger.info("Enqueued application to BullMQ", {
    applicationId,
    bullmqJobId: job.id,
    stage: "QUEUED",
  });

  return job;
}

export default jobQueue;
