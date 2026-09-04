import { Router } from "express";
import { getQueueTasks, getTaskById } from "../controllers/task.controller.js";

const router = Router();

// GET /api/tasks -> BullMQ queue categorized monitor
router.get("/", getQueueTasks);

// GET /api/tasks/:id -> Specific task details
router.get("/:id", getTaskById);

export default router;
