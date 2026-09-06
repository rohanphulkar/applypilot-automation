import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(requireAuth);

// GET /api/dashboard -> High-level metrics, active queues, and recent activity
router.get("/", getDashboardStats);

export default router;
