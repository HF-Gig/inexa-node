import nodemailer from "nodemailer";
import dotenv from "dotenv"
dotenv.config()
export async function handleForgotPasswordLink(to, resetLink) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD, // Use the app password generated in Step 1
      },
    });
    const responseEmail = await transporter.sendMail({
      from: process.env.EMAIL, // Sender address
      to, // Recipient address
      subject: "Reset Password", // Subject line
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>`,
    });
    return responseEmail;

  } catch (error) {
    console.error("Error while sending email:", error);
    throw error;
  }
}