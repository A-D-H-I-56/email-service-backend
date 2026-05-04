import express from "express";
import rateLimit from "express-rate-limit";
import { sendEmailController } from "../controllers/emailController.js";

const router = express.Router();

const sendEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/send-email", sendEmailLimiter, sendEmailController);

export const emailRoutes = router;
