import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendOTPEmail = async (to, otp) => {
  await transporter.sendMail({
    from:    `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
    to,
    subject: "Your OTP — End_Loop Hackathon",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2>Verify Your Email</h2>
        <p>Your OTP expires in <strong>10 minutes</strong>.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;text-align:center;
                    padding:20px;background:#f4f4f4;border-radius:8px;margin:24px 0;">
          ${otp}
        </div>
        <p style="color:#888;font-size:12px;">If you did not request this, ignore this email.</p>
      </div>
    `,
  });
};