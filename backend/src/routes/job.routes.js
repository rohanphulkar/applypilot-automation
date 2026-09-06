import { Router } from "express";
import {
  createJob,
  parseJobImage,
  getJob,
  listJobs,
  updateJob,
  sendJobEmail,
  retryJob,
  deleteJob,
} from "../controllers/job.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Apply auth middleware to all job routes
router.use(requireAuth);

// POST /api/jobs/parse-image -> Parse job description from screenshot with AI Vision
router.post("/parse-image", parseJobImage);

// POST /api/jobs -> Create new job application and enqueue background task
router.post("/", createJob);

// GET /api/jobs -> List all job applications with search, sort, filter & pagination
router.get("/", listJobs);

// GET /api/jobs/:id -> Retrieve status and full details of a single application
router.get("/:id", getJob);

// PATCH /api/jobs/:id -> Edit application, cover letter, and email draft
router.patch("/:id", updateJob);

// POST /api/jobs/:id/send -> Manually approve & send the application email
router.post("/:id/send", sendJobEmail);

// POST /api/jobs/:id/retry -> Retry a failed job application
router.post("/:id/retry", retryJob);

// DELETE /api/jobs/:id -> Delete a job application
router.delete("/:id", deleteJob);

export default router;
