import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      default: "guest",
      index: true,
    },
    senderEmail: {
      type: String,
      required: true,
    },
    recipient: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["sent", "failed"],
      required: true,
      index: true,
    },
    latencyMs: {
      type: Number,
      default: 0,
    },
    error: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const EmailLog = mongoose.model("EmailLog", emailLogSchema);
