import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { emailRoutes } from "./routes/emailRoutes.js";
dotenv.config();

const app = express();
app.use(helmet());
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
  }),
);
app.use(express.json());

app.use("/api", emailRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
