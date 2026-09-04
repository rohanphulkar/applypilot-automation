import mongoose from "mongoose";
import app from "./app.js";
import config from "./config/config.js";
import logger from "./utils/logger.js";
import { redisConnection } from "./queues/job.queue.js";

let server;

async function startServer() {
  try {
    // 1. Connect to MongoDB
    logger.info("Connecting to MongoDB...");
    await mongoose.connect(config.mongodb.uri);
    logger.info(`MongoDB Connected successfully: ${mongoose.connection.host}`);

    // 2. Start Express HTTP Server
    server = app.listen(config.server.port, () => {
      logger.info(`ApplyPilot API Server listening on port ${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
    });
  } catch (error) {
    logger.error(`Failed to start API server: ${error.message}`);
    process.exit(1);
  }
}

// Graceful Shutdown Handler
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down API server gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info("HTTP server closed.");

      try {
        await mongoose.connection.close();
        logger.info("MongoDB connection closed.");

        await redisConnection.quit();
        logger.info("Redis queue connection closed.");

        process.exit(0);
      } catch (err) {
        logger.error(`Error during graceful shutdown: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

startServer();
