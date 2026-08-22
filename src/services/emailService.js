import nodemailer from "nodemailer";
import { google } from "googleapis";

/**
 * Creates a Nodemailer transporter for given auth config
 */
export const createTransporterForAuth = async (authConfig) => {
  if (!authConfig || !authConfig.user) {
    throw new Error("Missing authentication credentials");
  }

  if (authConfig.type === "oauth2" || authConfig.refreshToken) {
    const oauth2Client = new google.auth.OAuth2(
      authConfig.clientId,
      authConfig.clientSecret,
      authConfig.redirectUri || "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: authConfig.refreshToken });

    const accessToken = await oauth2Client.getAccessToken();
    const token = typeof accessToken === "string" ? accessToken : accessToken?.token;

    if (!token) {
      throw new Error("Failed to generate OAuth2 access token with provided credentials");
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: authConfig.user,
        clientId: authConfig.clientId,
        clientSecret: authConfig.clientSecret,
        refreshToken: authConfig.refreshToken,
        accessToken: token,
      },
    });
  }

  // App Password flow (SMTP)
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: authConfig.user,
      pass: authConfig.pass,
    },
  });
};

/**
 * Verifies that the provided credentials are functional
 */
export const verifyTransporter = async (authConfig) => {
  const transporter = await createTransporterForAuth(authConfig);
  return await transporter.verify();
};

/**
 * Interpolates variables formatted as {varName} or {{varName}} in text/html
 */
const interpolateTemplate = (content, variables = {}, recipient = "") => {
  if (!content) return content;
  let result = content;

  // Extract a default recipient name if {name} wasn't supplied
  const fallbackName = recipient ? recipient.split("@")[0] : "there";
  const mergedVars = {
    name: fallbackName,
    ...variables,
  };

  for (const [key, value] of Object.entries(mergedVars)) {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{\\{?\\s*${key}\\s*\\}?}`, "gi");
      result = result.replace(regex, String(value));
    }
  }

  return result;
};

/**
 * Dispatches an email using given credentials and message details
 */
export const sendEmailMessage = async (authConfig, message) => {
  const transporter = await createTransporterForAuth(authConfig);

  const formattedFrom = message.fromName
    ? `"${message.fromName}" <${authConfig.user}>`
    : authConfig.user;

  const targetRecipient = Array.isArray(message.to) ? message.to.join(", ") : message.to;
  const variables = message.variables || {};

  const interpolatedSubject = interpolateTemplate(message.subject, variables, targetRecipient);
  const interpolatedHtml = interpolateTemplate(message.html, variables, targetRecipient);
  const interpolatedText = message.text ? interpolateTemplate(message.text, variables, targetRecipient) : undefined;

  const mailOptions = {
    from: formattedFrom,
    to: message.to,
    subject: interpolatedSubject,
    html: interpolatedHtml,
    text: interpolatedText,
    cc: message.cc || undefined,
    bcc: message.bcc || undefined,
    replyTo: message.replyTo || undefined,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};
