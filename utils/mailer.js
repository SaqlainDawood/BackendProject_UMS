import axios from "axios";
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

const normalize = (value) => String(value ?? "").trim();

export const sendMail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
  fromName,
  fromEmail,
  senderName,
  senderEmail,
  unsubscribeUrl,
}) => {
  if (!to || !subject || (!html && !text)) {
    return {
      success: false,
      error: "Missing required fields: to, subject, html/text",
    };
  }

  const apiKey = normalize(process.env.BREVO_API_KEY);
  if (!apiKey) {
    return {
      success: false,
      error: "BREVO_API_KEY missing in environment",
    };
  }

  const finalFromName = normalize(senderName || fromName || process.env.MAIL_FROM_NAME || "University Management System");
  const finalFromEmail = normalize(senderEmail || fromEmail || process.env.MAIL_FROM_EMAIL || "");
  const finalReplyTo = normalize(replyTo || process.env.MAIL_REPLY_TO || finalFromEmail);
  const finalUnsubscribeUrl = unsubscribeUrl || process.env.UNSUBSCRIBE_URL || null;

  if (!finalFromEmail) {
    return {
      success: false,
      error: "MAIL_FROM_EMAIL missing in environment",
    };
  }

  const payload = {
    sender: {
      name: finalFromName,
      email: finalFromEmail,
    },
    to: [
      {
        email: String(to).trim(),
        name: String(to).split("@")[0] || "User",
      },
    ],
    subject: String(subject).trim(),
    ...(html ? { htmlContent: html } : {}),
    ...(text || html ? { textContent: text || htmlToText(html || "") } : {}),
    ...(finalReplyTo ? { replyTo: { email: finalReplyTo, name: finalFromName } } : {}),
    ...(finalUnsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${finalUnsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  };

  try {
    const response = await axios.post("https://api.brevo.com/v3/smtp/email", payload, {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 20000,
    });

    const messageId = response?.data?.messageId || response?.data?.id || null;

    return {
      success: true,
      provider: "brevo",
      messageId,
      data: response.data,
    };
  } catch (error) {
    const status = error.response?.status || "n/a";
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Brevo email send failed";

    console.error("Brevo email send failed:", {
      status,
      to: String(to).slice(0, 120),
      subject: String(subject).slice(0, 180),
      error: message,
    });

    return {
      success: false,
      error: message,
    };
  }
};
