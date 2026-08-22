import mongoose from "mongoose";

const userConfigSchema = new mongoose.Schema(
  {
    clerkUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    emailUser: {
      type: String,
      required: true,
      trim: true,
    },
    authType: {
      type: String,
      enum: ["app_password", "oauth2"],
      default: "app_password",
    },
    // Encrypted app password or refresh token
    encryptedCredentials: {
      type: String,
      required: true,
    },
    // For OAuth2
    clientId: {
      type: String,
      default: "",
    },
    encryptedClientSecret: {
      type: String,
      default: "",
    },
    defaultSenderName: {
      type: String,
      default: "",
    },
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const UserConfig = mongoose.model("UserConfig", userConfigSchema);
