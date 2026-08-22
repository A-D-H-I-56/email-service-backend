import express from "express";
import rateLimit from "express-rate-limit";
import {
  sendEmailController,
  verifyCredentialsController,
  getUserConfigController,
  saveUserConfigController,
  getEmailLogsController,
} from "../controllers/emailController.js";

const router = express.Router();

const sendEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many email requests from this IP, please try again after 15 minutes",
  },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many verification requests, please try again later",
  },
});

// Email delivery & verification
router.post("/send-email", sendEmailLimiter, sendEmailController);
router.post("/verify-credentials", verifyLimiter, verifyCredentialsController);

// User Config & MongoDB Persistence (Clerk authenticated)
router.get("/user-config", getUserConfigController);
router.post("/user-config", saveUserConfigController);
router.get("/email-logs", getEmailLogsController);

export const emailRoutes = router;
