import rateLimit from "express-rate-limit";
import type { Request } from "express";

export const geminiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => req.params.studentId,
  message: {
    message: "Too many generation requests. Please wait before trying again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});
