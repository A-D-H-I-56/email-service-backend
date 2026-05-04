import { sendEmail } from "../services/emailService.js";

export const sendEmailController = async (req, res, next) => {
  const { to, subject, htmlContent } = req.body;
  if (!to || !subject || !htmlContent) {
    return res
      .status(400)
      .json({ message: "'to', 'subject', and 'htmlContent' are required" });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(to)) {
    return res.status(400).json({ message: "Invalid 'to' email address" });
  }
  try {
    await sendEmail(to, subject, htmlContent);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    next(error);
  }
};
