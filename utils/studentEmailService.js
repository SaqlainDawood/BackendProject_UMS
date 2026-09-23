// utils/studentEmailService.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) {
      throw new Error("Missing required fields");
    }

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("BREVO_API_KEY missing");

    const payload = {
      sender: {
        email: process.env.EMAIL_USER,
        name: process.env.UNIVERSITY_NAME || "UMS Portal",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    const res = await axios.post(BREVO_API_URL, payload, {
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      timeout: 20000,
    });

    console.log(`✅ Student email sent to ${to} — msgId: ${res.data?.messageId}`);
    return { success: true, messageId: res.data?.messageId };
  } catch (err) {
    const msg =
      err.response?.data?.message || err.response?.data?.error || err.message;
    console.error("❌ studentEmailService error:", msg);
    return { success: false, error: msg };
  }
};
const baseTemplate = ({
  title,
  bodyHtml,
  actionUrl,
  actionText,
  headerColor = "#2563eb",
}) => {
  const appName = process.env.UNIVERSITY_NAME || "UMS Portal";
  const contact = process.env.UNIVERSITY_CONTACT || "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:${headerColor};padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">${appName}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 20px;color:#1f2937;font-size:20px;font-weight:600;">${title}</h2>
            <div style="color:#374151;font-size:15px;line-height:1.6;">${bodyHtml}</div>
            ${
              actionUrl && actionText
                ? `<div style="text-align:center;margin:36px 0;">
                     <a href="${actionUrl}" style="display:inline-block;background:${headerColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">${actionText}</a>
                   </div>
                   <p style="color:#6b7280;font-size:13px;text-align:center;">Or copy: <a href="${actionUrl}" style="color:${headerColor};word-break:break-all;">${actionUrl}</a></p>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">Automated message. Do not reply.<br/>${contact ? `Contact: ${contact}` : ""}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

export const sendStudentVerificationEmail = async ({ to, name, verifyUrl }) => {
  const html = baseTemplate({
    title: "Verify Your Email Address",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>Thank you for signing up at ${process.env.UNIVERSITY_NAME || "UMS Portal"}. Please verify your email address to continue your admission application.</p>
      <p style="color:#dc2626;font-weight:500;margin-top:16px;">⏱️ This link is valid for <strong>24 hours</strong>.</p>
      <p>If you didn't sign up, ignore this email.</p>
    `,
    actionUrl: verifyUrl,
    actionText: "Verify Email",
    headerColor: "#2563eb",
  });

  return sendEmail({
    to,
    subject: "Verify Your Email — Student Registration",
    html,
  });
};

/* ============================================================
   2. WELCOME (after email verified)
   ============================================================ */
export const sendStudentWelcomeEmail = async ({ to, name }) => {
  const html = baseTemplate({
    title: `Welcome, ${name || "Student"}! 🎓`,
    bodyHtml: `
      <p>Your email has been successfully verified.</p>
      <p>You can now login and complete your admission application. Fill all 4 steps to submit your application.</p>
    `,
    actionUrl: process.env.FRONT_END_URL,
    actionText: "Continue Application",
    headerColor: "#16a34a",
  });

  return sendEmail({
    to,
    subject: "Email Verified — Continue Your Application",
    html,
  });
};

export const sendStudentPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = baseTemplate({
    title: "Reset Your Password",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>We received a request to reset your student account password. Click the button below to set a new password.</p>
      <p style="color:#dc2626;font-weight:500;margin-top:16px;">
        ⏱️ This link is valid for <strong>15 minutes</strong>.
      </p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
    actionUrl: resetUrl,
    actionText: "Reset Password",
    headerColor: "#dc2626",
  });

  return sendEmail({
    to,
    subject: "Password Reset — Student Account",
    html,
  });
};

/* ============================================================
   4. PASSWORD CHANGED CONFIRMATION
   ============================================================ */
export const sendStudentPasswordChangedEmail = async ({ to, name, time }) => {
  const html = baseTemplate({
    title: "Your Password Was Changed",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>Your student account password was successfully changed.</p>
      <p style="margin-top:16px;"><strong>Time:</strong> ${time || new Date().toLocaleString()}</p>
      <p style="color:#dc2626;font-weight:500;margin-top:16px;">
        ⚠️ If this wasn't you, contact your administrator immediately.
      </p>
    `,
    actionUrl: process.env.FRONT_END_URL,
    actionText: "Go to Portal",
    headerColor: "#dc2626",
  });

  return sendEmail({
    to,
    subject: "Security Alert — Password Changed",
    html,
  });
};