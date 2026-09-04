import mongoose from "mongoose";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import { startJobWorker, workerRedisConnection } from "./workers/job.worker.js";
import { redisConnection } from "./queues/job.queue.js";

let workerInstance;

async function startWorkerService() {
  try {
    // 1. Connect to MongoDB
    logger.info("Connecting Worker to MongoDB...");
    await mongoose.connect(config.mongodb.uri);
    logger.info(`Worker connected to MongoDB: ${mongoose.connection.host}`);

    // 2. Start BullMQ Worker
    workerInstance = startJobWorker();
    logger.info("ApplyPilot BullMQ Background Worker started and listening for jobs.");
  } catch (error) {
    logger.error(`Failed to start BullMQ Worker: ${error.message}`);
    process.exit(1);
  }
}

// Graceful Shutdown Handler for Worker
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down BullMQ worker gracefully...`);

  try {
    if (workerInstance) {
      await workerInstance.close();
      logger.info("BullMQ Worker closed.");
    }

    await mongoose.connection.close();
    logger.info("MongoDB connection closed.");

    await workerRedisConnection.quit();
    await redisConnection.quit();
    logger.info("Redis connections closed.");

    process.exit(0);
  } catch (err) {
    logger.error(`Error during worker graceful shutdown: ${err.message}`);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startWorkerService();
