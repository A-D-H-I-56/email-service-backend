import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { google } from "googleapis";
dotenv.config();

const {
  EMAIL_USER,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
  GOOGLE_REDIRECT_URI,
} = process.env;

if (
  !EMAIL_USER ||
  !GOOGLE_CLIENT_ID ||
  !GOOGLE_CLIENT_SECRET ||
  !GOOGLE_REFRESH_TOKEN
) {
  throw new Error("Missing required Gmail OAuth2 environment variables");
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground",
);
oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

export const createTransporter = async () => {
  const accessToken = await oauth2Client.getAccessToken();
  const token =
    typeof accessToken === "string" ? accessToken : accessToken?.token;
  if (!token) {
    throw new Error("Failed to generate Gmail OAuth2 access token");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: EMAIL_USER,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: GOOGLE_REFRESH_TOKEN,
      accessToken: token,
    },
  });
};
