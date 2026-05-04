import { createTransporter } from "../config/mailConfig.js";
export const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: htmlContent,
    };
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};
