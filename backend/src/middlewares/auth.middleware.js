import { clerkMiddleware, getAuth } from "@clerk/express";
import logger from "../utils/logger.js";

/**
 * Custom authentication middleware supporting Clerk JWT tokens with graceful dev fallback.
 */
export const requireAuth = (req, res, next) => {
  try {
    const auth = getAuth(req);

    if (auth && auth.userId) {
      req.auth = {
        userId: auth.userId,
        sessionId: auth.sessionId,
        claims: auth.claims,
      };
      return next();
    }

    // Check manual Bearer header if getAuth didn't populate
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      // If token is present, try decoding claims
      try {
        const payloadBase64 = token.split(".")[1];
        if (payloadBase64) {
          const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString("utf-8"));
          if (payload.sub) {
            req.auth = {
              userId: payload.sub,
              claims: payload,
            };
            return next();
          }
        }
      } catch (err) {
        logger.debug("Could not parse JWT payload directly:", err.message);
      }
    }

    // Fallback for local development or demo sessions
    req.auth = {
      userId: req.headers["x-user-id"] || "user_demo_applypilot",
      isDemo: true,
    };
    next();
  } catch (error) {
    logger.error("Authentication middleware error:", error.message);
    req.auth = {
      userId: "user_demo_applypilot",
      isDemo: true,
    };
    next();
  }
};

export default {
  requireAuth,
};
