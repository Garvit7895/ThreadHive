// lib/email.ts
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // App password (not your Gmail password!)
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?email=${to}&token=${token}`;

  await transporter.sendMail({
    from: `"ThreadHive" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Verify your email",
    html: `
      <h1>Email Verification</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
    `,
  });
}
