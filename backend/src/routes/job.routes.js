import { Router } from "express";
import {
  createJob,
  getJob,
  listJobs,
  retryJob,
  deleteJob,
} from "../controllers/job.controller.js";

const router = Router();

// POST /api/jobs -> Create new job application and enqueue background task
router.post("/", createJob);

// GET /api/jobs -> List all job applications with search, sort, filter & pagination
router.get("/", listJobs);

// GET /api/jobs/:id -> Retrieve status and full details of a single application
router.get("/:id", getJob);

// POST /api/jobs/:id/retry -> Retry a failed job application
router.post("/:id/retry", retryJob);

// DELETE /api/jobs/:id -> Delete a job application
router.delete("/:id", deleteJob);

export default router;
