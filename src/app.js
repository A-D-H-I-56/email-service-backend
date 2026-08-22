import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";
import { emailRoutes } from "./routes/emailRoutes.js";
import { connectDB } from "./config/db.js";

dotenv.config();

// Initialize MongoDB connection asynchronously
connectDB();

const app = express();

app.use(helmet());

const defaultOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, cURL) or matched origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
};

// Express 5 compatible CORS middleware
app.use(cors(corsOptions));

app.use(express.json({ limit: "5mb" }));

// Clerk authentication middleware (adds req.auth)
if (process.env.CLERK_SECRET_KEY) {
  app.use(
    clerkMiddleware({
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    })
  );
} else {
  console.warn("⚠️  CLERK_SECRET_KEY is missing. Operating in Guest/Stateless Mode.");
}

// API Routes
app.use("/api", emailRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Open BYOC Email Gateway",
    clerkEnabled: !!process.env.CLERK_SECRET_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Sanitized Global Error Handler
app.use((err, req, res, next) => {
  // Sanitize message to prevent leaking secrets
  const sanitizedMessage = String(err.message || "Internal server error")
    .replace(/pass:\s*['"][^'"]+['"]/gi, "pass: '[REDACTED]'")
    .replace(/clientSecret:\s*['"][^'"]+['"]/gi, "clientSecret: '[REDACTED]'")
    .replace(/refreshToken:\s*['"][^'"]+['"]/gi, "refreshToken: '[REDACTED]'");

  console.error("Unhandled error:", sanitizedMessage);

  res.status(err.status || 500).json({
    success: false,
    message: sanitizedMessage,
  });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

export default app;
