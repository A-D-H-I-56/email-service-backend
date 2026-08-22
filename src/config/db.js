import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("⚠️  MONGODB_URI is not defined in .env. MongoDB features (user configs & logs) will be inactive until connected.");
    return false;
  }

  try {
    await mongoose.connect(uri);
    console.log(" Connected to MongoDB successfully.");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    return false;
  }
};
