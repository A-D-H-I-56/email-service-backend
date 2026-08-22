import {
  sendEmailRequestSchema,
  verifyCredentialsSchema,
  saveUserConfigSchema,
} from "../schemas/emailSchema.js";
import { sendEmailMessage, verifyTransporter } from "../services/emailService.js";
import { UserConfig } from "../models/UserConfig.js";
import { EmailLog } from "../models/EmailLog.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { getAuth } from "@clerk/express";
import crypto from "crypto";

/**
 * Safely extracts Clerk user ID from request
 */
const getClerkUserId = (req) => {
  try {
    const auth = getAuth(req);
    if (auth && auth.userId) return auth.userId;
  } catch (e) {}

  if (req.auth?.userId) return req.auth.userId;

  // Fallback: Parse Bearer JWT payload if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf8"));
        if (payload.sub) {
          return payload.sub;
        }
      }
    } catch (err) {}
  }

  return null;
};

/**
 * Resolves auth credentials from Clerk user session, API Key, or Request Body
 */
const resolveAuthCredentials = async (req) => {
  // 1. Check API Key header
  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const config = await UserConfig.findOne({ apiKey });
    if (config) {
      return {
        auth: {
          user: config.emailUser,
          type: config.authType,
          pass: config.authType === "app_password" ? decrypt(config.encryptedCredentials) : undefined,
          clientId: config.clientId || undefined,
          clientSecret: config.encryptedClientSecret ? decrypt(config.encryptedClientSecret) : undefined,
          refreshToken: config.authType === "oauth2" ? decrypt(config.encryptedCredentials) : undefined,
        },
        userId: config.clerkUserId,
        defaultSenderName: config.defaultSenderName,
      };
    }
  }

  // 2. Check Clerk authenticated session
  const clerkUserId = getClerkUserId(req);
  if (clerkUserId) {
    const config = await UserConfig.findOne({ clerkUserId });
    if (config) {
      return {
        auth: {
          user: config.emailUser,
          type: config.authType,
          pass: config.authType === "app_password" ? decrypt(config.encryptedCredentials) : undefined,
          clientId: config.clientId || undefined,
          clientSecret: config.encryptedClientSecret ? decrypt(config.encryptedClientSecret) : undefined,
          refreshToken: config.authType === "oauth2" ? decrypt(config.encryptedCredentials) : undefined,
        },
        userId: clerkUserId,
        defaultSenderName: config.defaultSenderName,
      };
    }
  }

  // 3. Check request body credentials (Guest / Stateless mode)
  if (req.body.auth) {
    return {
      auth: req.body.auth,
      userId: clerkUserId || "guest",
      defaultSenderName: undefined,
    };
  }

  return { auth: null, userId: clerkUserId || "guest" };
};

/**
 * Handles sending emails with full support for BYOC and Clerk
 */
export const sendEmailController = async (req, res, next) => {
  const startTime = Date.now();
  let resolvedUserId = "guest";
  let targetEmail = "unknown";
  let subjectText = "";

  try {
    const parsed = sendEmailRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const { auth, userId, defaultSenderName } = await resolveAuthCredentials(req);
    resolvedUserId = userId;

    if (!auth || !auth.user) {
      return res.status(400).json({
        success: false,
        message: "No email credentials provided. Please supply credentials in the request or configure them in your dashboard.",
      });
    }

    const message = {
      ...parsed.data.message,
      fromName: parsed.data.message.fromName || defaultSenderName,
    };

    targetEmail = Array.isArray(message.to) ? message.to.join(", ") : message.to;
    subjectText = message.subject;

    const result = await sendEmailMessage(auth, message);
    const latencyMs = Date.now() - startTime;

    // Log to MongoDB if connected
    try {
      await EmailLog.create({
        clerkUserId: resolvedUserId,
        senderEmail: auth.user,
        recipient: targetEmail,
        subject: subjectText,
        status: "sent",
        latencyMs,
      });
    } catch (logErr) {
      // Non-blocking log error
    }

    return res.status(200).json({
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
      latencyMs,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;

    // Log failure to MongoDB
    try {
      await EmailLog.create({
        clerkUserId: resolvedUserId,
        senderEmail: req.body?.auth?.user || "unknown",
        recipient: targetEmail,
        subject: subjectText,
        status: "failed",
        latencyMs,
        error: error.message,
      });
    } catch (logErr) {
      // Non-blocking log error
    }

    next(error);
  }
};

/**
 * Tests / verifies provided credentials
 */
export const verifyCredentialsController = async (req, res, next) => {
  try {
    const parsed = verifyCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid credential payload",
        errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    await verifyTransporter(parsed.data.auth);

    return res.status(200).json({
      success: true,
      message: "Credentials verified successfully. Ready to send emails!",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to verify credentials",
    });
  }
};

/**
 * Gets saved configuration for a Clerk user
 */
export const getUserConfigController = async (req, res, next) => {
  try {
    const clerkUserId = getClerkUserId(req);
    if (!clerkUserId) {
      return res.status(200).json({ success: true, config: null });
    }

    const config = await UserConfig.findOne({ clerkUserId });
    if (!config) {
      return res.status(200).json({ success: true, config: null });
    }

    return res.status(200).json({
      success: true,
      config: {
        emailUser: config.emailUser,
        authType: config.authType,
        clientId: config.clientId,
        defaultSenderName: config.defaultSenderName,
        apiKey: config.apiKey,
        hasSavedCredentials: true,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Saves or updates configuration for a Clerk user in MongoDB
 */
export const saveUserConfigController = async (req, res, next) => {
  try {
    const clerkUserId = getClerkUserId(req);
    if (!clerkUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in to save credentials." });
    }

    const parsed = saveUserConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
      });
    }

    const { emailUser, authType, appPassword, clientId, clientSecret, refreshToken, defaultSenderName } = parsed.data;

    let encryptedCreds = "";
    let encryptedSecret = "";

    if (authType === "app_password") {
      if (!appPassword) {
        return res.status(400).json({ success: false, message: "App password is required" });
      }
      encryptedCreds = encrypt(appPassword);
    } else {
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: "Refresh token is required for OAuth2" });
      }
      encryptedCreds = encrypt(refreshToken);
      if (clientSecret) {
        encryptedSecret = encrypt(clientSecret);
      }
    }

    // Generate or keep API key
    let config = await UserConfig.findOne({ clerkUserId });
    const apiKey = config?.apiKey || `es_${crypto.randomBytes(24).toString("hex")}`;

    config = await UserConfig.findOneAndUpdate(
      { clerkUserId },
      {
        clerkUserId,
        emailUser,
        authType,
        encryptedCredentials: encryptedCreds,
        clientId: clientId || "",
        encryptedClientSecret: encryptedSecret,
        defaultSenderName: defaultSenderName || "",
        apiKey,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Configuration saved securely",
      apiKey: config.apiKey,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches send history / activity logs for a Clerk user
 */
export const getEmailLogsController = async (req, res, next) => {
  try {
    const clerkUserId = getClerkUserId(req);
    if (!clerkUserId) {
      return res.status(200).json({ success: true, logs: [] });
    }

    const logs = await EmailLog.find({ clerkUserId }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    next(error);
  }
};
