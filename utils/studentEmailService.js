// utils/studentEmailService.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/* CORE SENDER */
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!to || !subject || !html) throw new Error("Missing required fields");

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

    console.log(`✅ Student email sent to ${to}`);
    return { success: true, messageId: res.data?.messageId };
  } catch (err) {
    const msg =
      err.response?.data?.message || err.response?.data?.error || err.message;
    console.error("❌ studentEmailService error:", msg);
    return { success: false, error: msg };
  }
};

/* BASE TEMPLATE */
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
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="background:${headerColor};padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">${appName}</h1>
        </td></tr>
        <tr><td style="padding:40px;">
          <h2 style="margin:0 0 20px;color:#1f2937;font-size:20px;font-weight:600;">${title}</h2>
          <div style="color:#374151;font-size:15px;line-height:1.6;">${bodyHtml}</div>
          ${actionUrl && actionText ? `<div style="text-align:center;margin:36px 0;">
            <a href="${actionUrl}" style="display:inline-block;background:${headerColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;">${actionText}</a>
          </div>` : ""}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Automated message. Do not reply.${contact ? `<br/>Contact: ${contact}` : ""}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

/* 1. VERIFY EMAIL */
export const sendStudentVerificationEmail = async ({ to, name, verifyUrl }) => {
  const html = baseTemplate({
    title: "Verify Your Email Address",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>Thank you for signing up. Please verify your email to continue your admission application.</p>
      <p style="color:#dc2626;font-weight:500;">⏱️ Valid for <strong>24 hours</strong>.</p>
    `,
    actionUrl: verifyUrl,
    actionText: "Verify Email",
  });
  return sendEmail({ to, subject: "Verify Your Email — Student Registration", html });
};

/* 2. WELCOME */
export const sendStudentWelcomeEmail = async ({ to, name }) => {
  const html = baseTemplate({
    title: `Welcome, ${name || "Student"}! 🎓`,
    bodyHtml: `
      <p>Your email has been verified successfully.</p>
      <p>You can now login and complete your admission application.</p>
    `,
    actionUrl: process.env.FRONT_END_URL,
    actionText: "Continue Application",
    headerColor: "#16a34a",
  });
  return sendEmail({ to, subject: "Email Verified — Continue Your Application", html });
};

/* 3. PASSWORD RESET */
export const sendStudentPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = baseTemplate({
    title: "Reset Your Password",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>Click the button to set a new password.</p>
      <p style="color:#dc2626;font-weight:500;">⏱️ Valid for <strong>15 minutes</strong>.</p>
    `,
    actionUrl: resetUrl,
    actionText: "Reset Password",
    headerColor: "#dc2626",
  });
  return sendEmail({ to, subject: "Password Reset — Student Account", html });
};

/* 4. PASSWORD CHANGED */
export const sendStudentPasswordChangedEmail = async ({ to, name, time }) => {
  const html = baseTemplate({
    title: "Your Password Was Changed",
    bodyHtml: `
      <p>Hi <strong>${name || "Student"}</strong>,</p>
      <p>Your password was successfully changed.</p>
      <p><strong>Time:</strong> ${time || new Date().toLocaleString()}</p>
      <p style="color:#dc2626;font-weight:500;">⚠️ If this wasn't you, contact admin immediately.</p>
    `,
    actionUrl: process.env.FRONT_END_URL,
    actionText: "Go to Portal",
    headerColor: "#dc2626",
  });
  return sendEmail({ to, subject: "Security Alert — Password Changed", html });
};

/* 5. APPLICATION APPROVED */
export const sendStudentApprovedEmail = async ({
  to,
  name,
  rollNo,
  registrationNo,
  program,
  department,
}) => {
  const appName = process.env.UNIVERSITY_NAME || "UMS Portal";
  const loginUrl = process.env.FRONT_END_URL;
  const contact = process.env.UNIVERSITY_CONTACT || "";

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:40px 32px;text-align:center;">
          <div style="font-size:56px;margin-bottom:12px;">🎉</div>
          <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">Congratulations, ${name}!</h1>
          <p style="margin:10px 0 0;color:#dcfce7;font-size:15px;">Your admission is approved at ${appName}</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 20px;">
            Your admission application has been <strong style="color:#16a34a;">APPROVED</strong> 🎊
          </p>
          <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:0 0 24px;border-radius:8px;">
            <p style="margin:0 0 12px;font-weight:700;color:#166534;font-size:15px;">📋 Your Admission Details</p>
            <table style="width:100%;font-size:14px;color:#374151;">
              ${rollNo ? `<tr><td style="padding:6px 0;width:150px;"><strong>Roll No:</strong></td><td style="padding:6px 0;">${rollNo}</td></tr>` : ""}
              ${registrationNo ? `<tr><td style="padding:6px 0;"><strong>Registration No:</strong></td><td style="padding:6px 0;">${registrationNo}</td></tr>` : ""}
              ${program ? `<tr><td style="padding:6px 0;"><strong>Program:</strong></td><td style="padding:6px 0;">${program}</td></tr>` : ""}
              ${department ? `<tr><td style="padding:6px 0;"><strong>Department:</strong></td><td style="padding:6px 0;">${department}</td></tr>` : ""}
              <tr><td style="padding:6px 0;"><strong>Email:</strong></td><td style="padding:6px 0;">${to}</td></tr>
            </table>
          </div>
          <div style="background:#f0f9ff;border-left:4px solid #0284c7;padding:14px 16px;margin:0 0 24px;border-radius:6px;">
            <p style="margin:0;color:#075985;font-size:13px;">
              ℹ️ Use your <strong>existing signup password</strong> to login.
            </p>
          </div>
          <div style="text-align:center;margin:32px 0;">
            <a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;">🚀 Login to Your Account</a>
          </div>
          <div style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:32px;">
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;">
              <strong>Welcome aboard! 🤝</strong>
            </p>
            <p style="color:#374151;font-size:15px;line-height:1.7;margin:0;">
              We're thrilled to have you join ${appName}.${contact ? ` Contact us at <strong>${contact}</strong>.` : ""}
            </p>
          </div>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Automated message.${contact ? `<br/>Contact: ${contact}` : ""}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return sendEmail({ to, subject: `🎉 Admission Approved — ${appName}`, html });
};

/* 6. APPLICATION REJECTED */
export const sendStudentRejectedEmail = async ({ to, name, reason }) => {
  const appName = process.env.UNIVERSITY_NAME || "UMS Portal";
  const contact = process.env.UNIVERSITY_CONTACT || "";

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#475569,#64748b);padding:40px 32px;text-align:center;">
          <div style="font-size:52px;margin-bottom:12px;">📋</div>
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">Application Status Update</h1>
          <p style="margin:10px 0 0;color:#e2e8f0;font-size:14px;">${appName}</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 16px;">Dear <strong>${name || "Student"}</strong>,</p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            After careful review, we regret to inform you that your application has
            <strong style="color:#dc2626;">not been approved</strong> at this time.
          </p>
          ${reason ? `<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;margin:0 0 24px;border-radius:8px;">
            <p style="margin:0 0 6px;font-weight:700;color:#991b1b;font-size:14px;">📝 Reason:</p>
            <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.6;">${reason}</p>
          </div>` : ""}
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;">
            If you believe this is a mistake, please contact us.
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.7;margin:24px 0 0;">
            Warm regards,<br/><strong>Admissions Team</strong><br/>${appName}
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Automated message.${contact ? `<br/>Contact: ${contact}` : ""}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return sendEmail({ to, subject: `Application Status — ${appName}`, html });
};