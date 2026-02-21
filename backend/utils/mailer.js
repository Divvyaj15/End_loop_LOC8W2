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
    from: `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
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

export const sendTeamInviteEmail = async (to, { inviteeName, leaderName, teamName, eventName }) => {
  await transporter.sendMail({
    from: `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
    to,
    subject: `🎯 Team Invite — ${teamName} | End_Loop Hackathon`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#4F46E5;">You've been invited to a team! 🎉</h2>
        <p>Hi <strong>${inviteeName}</strong>,</p>
        <p><strong>${leaderName}</strong> has invited you to join their team for <strong>${eventName}</strong>.</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:14px;color:#666;">Team Name</p>
          <p style="margin:8px 0 0;font-size:24px;font-weight:bold;color:#4F46E5;">${teamName}</p>
        </div>
        <p>Log in to your <strong>End_Loop dashboard</strong> to accept or decline this invitation.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">If you were not expecting this invite, you can safely ignore this email.</p>
      </div>
    `,
  });
};

export const sendShortlistEmail = async (to, { name, teamName, eventName }) => {
  await transporter.sendMail({
    from: `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
    to,
    subject: `🎉 You're Shortlisted! — ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#4F46E5;">Congratulations! 🎉</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Great news! Your team <strong>${teamName}</strong> has been shortlisted for <strong>${eventName}</strong>!</p>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#16a34a;">✅ You're In!</p>
          <p style="margin:8px 0 0;color:#15803d;">Check your dashboard for your Entry QR code and further details.</p>
        </div>
        <p>Please carry your Entry QR code on hackathon day for check-in.</p>
        <p style="color:#888;font-size:12px;margin-top:24px;">Best of luck from the End_Loop team! 🚀</p>
      </div>
    `,
  });
};

export const sendGrandFinaleEmail = async (to, { name, teamName, eventName }) => {
  await transporter.sendMail({
    from: `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
    to,
    subject: `🏆 Grand Finale Qualified! — ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#7c3aed;">You're in the Grand Finale! 🏆</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Awesome news — your team <strong>${teamName}</strong> has been moved to the <strong>Grand Finale</strong> for <strong>${eventName}</strong>.</p>
        <div style="background:#f5f3ff;border:1px solid #c4b5fd;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:18px;font-weight:bold;color:#7c3aed;">🎯 Grand Finale Qualified</p>
          <p style="margin:8px 0 0;color:#5b21b6;">Check your dashboard for next-phase updates.</p>
        </div>
        <p style="color:#888;font-size:12px;margin-top:24px;">Best of luck from the End_Loop team! 🚀</p>
      </div>
    `,
  });
};

export const sendCertificateEmail = async (to, { name, eventName, certificateUrl }) => {
  await transporter.sendMail({
    from: `"End_Loop Hackathon" <${process.env.MAIL_USER}>`,
    to,
    subject: `📜 Your Certificate for ${eventName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
        <h2 style="color:#4F46E5;">Congratulations! 🎓</h2>
        <p>Hi <strong>${name}</strong>,</p>
        <p>Your participation certificate for <strong>${eventName}</strong> is now available.</p>
        <div style="background:#f4f4f4;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0;font-size:16px;color:#333;">You can view and download your certificate using the link below:</p>
          <a href="${certificateUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">View Certificate</a>
        </div>
        <p style="color:#888;font-size:12px;margin-top:24px;">Thank you for participating! Best wishes from the End_Loop team! 🚀</p>
      </div>
    `,
  });
};