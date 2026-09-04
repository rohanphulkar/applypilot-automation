import { Router } from "express";
import {
  getSettings,
  getHealthStatus,
  testEmailConnection,
} from "../controllers/settings.controller.js";

const router = Router();

// GET /api/settings -> System configuration & diagnostics
router.get("/", getSettings);

// GET /api/settings/health -> Subsystem health check
router.get("/health", getHealthStatus);

// GET / POST /api/settings/test-email -> Direct SMTP & IMAP connectivity test
router.get("/test-email", testEmailConnection);
router.post("/test-email", testEmailConnection);

export default router;
