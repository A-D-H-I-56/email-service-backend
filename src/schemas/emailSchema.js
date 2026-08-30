import { z } from "zod";

export const appPasswordAuthSchema = z.object({
  type: z.literal("app_password").default("app_password"),
  user: z.string().email("Invalid Gmail address"),
  pass: z.string().min(1, "App password is required"),
});

export const oauth2AuthSchema = z.object({
  type: z.literal("oauth2"),
  user: z.string().email("Invalid Gmail address"),
  clientId: z.string().min(1, "Google Client ID is required"),
  clientSecret: z.string().min(1, "Google Client Secret is required"),
  refreshToken: z.string().min(1, "Google Refresh Token is required"),
  redirectUri: z.string().optional(),
});

export const authSchema = z.union([appPasswordAuthSchema, oauth2AuthSchema]);

const BLOCKED_FILE_EXTENSIONS = /\.(exe|bat|cmd|sh|vbs|js|scr|jar|iso|dll|msi|vbe|wsf|hta)$/i;

export const attachmentSchema = z
  .object({
    filename: z
      .string()
      .min(1, "Filename is required")
      .refine(
        (name) => !BLOCKED_FILE_EXTENSIONS.test(name),
        "Executable or dangerous file extensions are blocked by email security policies"
      ),
    content: z.string().optional(),
    path: z
      .string()
      .url("Path must be a valid URL")
      .refine(
        (url) => url.startsWith("https://"),
        "Only secure HTTPS URLs are permitted for remote attachments"
      )
      .optional(),
    contentType: z.string().optional(),
    cid: z.string().optional(),
    encoding: z.string().default("base64").optional(),
  })
  .refine(
    (data) => data.content || data.path,
    "Attachment must contain either 'content' (Base64) or 'path' (HTTPS URL)"
  );

export const emailMessageSchema = z.object({
  to: z.union([
    z.string().email("Invalid recipient email address"),
    z.array(z.string().email()).min(1, "At least one recipient is required"),
  ]),
  subject: z.string().min(1, "Subject is required").max(500, "Subject is too long"),
  html: z.string().min(1, "HTML content is required"),
  text: z.string().optional(),
  fromName: z.string().max(100).optional(),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  bcc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  replyTo: z.string().email().optional(),
  variables: z.record(z.any()).optional(),
  attachments: z.array(attachmentSchema).max(10, "Maximum 10 attachments allowed per email").optional(),
});

export const sendEmailRequestSchema = z.object({
  auth: authSchema.optional(), // Optional if user is authenticated via Clerk / stored config
  message: emailMessageSchema,
});

export const verifyCredentialsSchema = z.object({
  auth: authSchema,
});

export const saveUserConfigSchema = z.object({
  emailUser: z.string().email("Valid Gmail address required"),
  authType: z.enum(["app_password", "oauth2"]).default("app_password"),
  appPassword: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
  defaultSenderName: z.string().max(100).optional(),
});
