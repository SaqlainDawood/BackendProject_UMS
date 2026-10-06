import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const htmlToText = (html = "") => {
  if (!html) return "";

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
};

const getTransporter = () => {
  const hasBrevoConfig = Boolean(process.env.BREVO_SMTP_USER || process.env.BREVO_EMAIL_USER || process.env.BREVO_SMTP_PASS);
  const host = process.env.BREVO_SMTP_HOST || (hasBrevoConfig ? "smtp-relay.brevo.com" : "smtp.gmail.com");
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER || process.env.BREVO_EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.BREVO_SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("No SMTP credentials configured. Set BREVO_SMTP_USER/BREVO_SMTP_PASS or GMAIL_USER/GMAIL_APP_PASSWORD in .env");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: true },
  });
};

export const sendMail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  unsubscribeUrl,
}) => {
  if (!to || !subject || (!html && !text)) {
    throw new Error("Missing required fields: to, subject, html/text");
  }

  const fromName = process.env.MAIL_FROM_NAME || "University Management System";
  const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.BREVO_SMTP_USER || process.env.BREVO_EMAIL_USER || process.env.GMAIL_USER;

  if (!fromEmail) {
    throw new Error("MAIL_FROM_EMAIL missing in .env");
  }

  const finalText = text || htmlToText(html || "");
  const finalReplyTo = replyTo || process.env.MAIL_REPLY_TO || fromEmail;
  const finalUnsubscribeUrl = unsubscribeUrl || process.env.UNSUBSCRIBE_URL || null;

  const headers = {};
  if (finalUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${finalUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const transporter = getTransporter();

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      replyTo: finalReplyTo,
      subject,
      text: finalText,
      html: html || undefined,
      headers,
    });

    return {
      success: true,
      provider: "brevo",
      messageId: info.messageId || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
    };
  } catch (error) {
    console.error("Email send failed:", {
      to,
      subject,
      error: error.message,
    });
    throw error;
  }
};
