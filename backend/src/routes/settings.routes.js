import { Router } from "express";
import { getSettings, getHealthStatus } from "../controllers/settings.controller.js";

const router = Router();

// GET /api/settings -> System configuration & diagnostics
router.get("/", getSettings);

// GET /api/settings/health -> Subsystem health check
router.get("/health", getHealthStatus);

export default router;
