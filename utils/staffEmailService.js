import axios from "axios";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import dns from "dns";

dotenv.config();
dns.setDefaultResultOrder("ipv4first");
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const gmailTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
const sendViaBrevo = async ({ to, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY missing");
  }
  const senderEmail =
    process.env.BREVO_EMAIL_USER || process.env.EMAIL_USER;
  if (!senderEmail) {
    throw new Error("BREVO_EMAIL_USER / EMAIL_USER missing");
  }
  const payload = {
    sender: {
      email: senderEmail,
      name: process.env.UNIVERSITY_NAME || "UMS Portal",
    },
    to: [{ email: to }],
    subject,
    htmlContent: html || undefined,
    textContent: text || undefined,
  };
  const res = await axios.post(BREVO_API_URL, payload, {
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    timeout: 20000,
  });

  console.log(
    `✅ Staff email sent via Brevo to ${to} — msgId: ${res.data?.messageId}`
  );
  return {
    success: true,
    provider: "brevo",
    messageId: res.data?.messageId || null,
  };
};
const sendViaGmail = async ({ to, subject, html, text }) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser) {
    throw new Error("GMAIL_USER missing");
  }
  if (!gmailPassword) {
    throw new Error("GMAIL_APP_PASSWORD missing");
  }
  const appName = process.env.UNIVERSITY_NAME || "UMS Portal";
  const info = await gmailTransporter.sendMail({
    from: `"${appName}" <${gmailUser}>`,
    to,
    subject,
    text,
    html,
  });

  console.log(
    `✅ Staff email sent via Gmail fallback to ${to} — msgId: ${info.messageId}`
  );
  return {
    success: true,
    provider: "gmail",
    messageId: info.messageId || null,
  };
};
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    if (!to || !subject || (!html && !text)) {
      return {
        success: false,
        error: "Missing required fields: to, subject, html/text",
      };
    }

    let brevoError = null;
    let gmailError = null;
    try {
      const result = await sendViaBrevo({
        to,
        subject,
        html,
        text,
      });

      console.log(`✅ Staff email delivered via Brevo to ${to}`);

      return result;
    } catch (err) {
      brevoError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Unknown Brevo error";

      console.warn(
        `⚠️ Staff Brevo failed for ${to}: ${brevoError}`
      );
    }
    try {
      const result = await sendViaGmail({
        to,
        subject,
        html,
        text,
      });

      console.log(
        `✅ Staff email delivered via Gmail fallback to ${to}`
      );

      return result;
    } catch (err) {
      gmailError =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Unknown Gmail error";

      console.error(
        `❌ Staff Gmail fallback failed for ${to}: ${gmailError}`
      );
    }
    return {
      success: false,
      error: `Brevo: ${brevoError} | Gmail: ${gmailError}`,
    };
  } catch (err) {
    console.error(
      "❌ staffEmailService unexpected error:",
      err.message
    );

    return {
      success: false,
      error: err.message,
    };
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
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>

<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif;">

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="background:#f4f6f8;padding:40px 0;"
  >
    <tr>
      <td align="center">

        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"
        >

          <!-- HEADER -->
          <tr>
            <td
              style="background:${headerColor};padding:32px 40px;text-align:center;"
            >
              <h1
                style="margin:0;color:#fff;font-size:22px;font-weight:600;"
              >
                ${appName}
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px;">

              <h2
                style="margin:0 0 20px;color:#1f2937;font-size:20px;font-weight:600;"
              >
                ${title}
              </h2>

              <div
                style="color:#374151;font-size:15px;line-height:1.6;"
              >
                ${bodyHtml}
              </div>

              ${
                actionUrl && actionText
                  ? `
                    <div style="text-align:center;margin:36px 0;">

                      <a
                        href="${actionUrl}"
                        style="display:inline-block;background:${headerColor};color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;"
                      >
                        ${actionText}
                      </a>

                    </div>

                    <p
                      style="color:#6b7280;font-size:13px;text-align:center;"
                    >
                      Or copy:
                      <a
                        href="${actionUrl}"
                        style="color:${headerColor};word-break:break-all;"
                      >
                        ${actionUrl}
                      </a>
                    </p>
                  `
                  : ""
              }

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;"
            >
              <p
                style="margin:0;color:#9ca3af;font-size:12px;"
              >
                Automated message. Do not reply.
                ${
                  contact
                    ? `<br/>Contact: ${contact}`
                    : ""
                }
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
};
export const sendStaffVerificationEmail = async ({
  to,
  name,
  verifyUrl,
}) => {
  const html = baseTemplate({
    title: "Verify Your Email Address",

    bodyHtml: `
      <p>
        Hi <strong>${name || "Applicant"}</strong>,
      </p>

      <p>
        Thank you for signing up as a staff applicant.
        Please verify your email address to continue your application.
      </p>

      <p
        style="color:#dc2626;font-weight:500;margin-top:16px;"
      >
        ⏱️ This link is valid for
        <strong>24 hours</strong>.
      </p>

      <p>
        If you didn't sign up, ignore this email.
      </p>
    `,

    actionUrl: verifyUrl,
    actionText: "Verify Email",
    headerColor: "#2563eb",
  });

  return sendEmail({
    to,
    subject: "Verify Your Email — Staff Application",
    html,
  });
};
export const sendStaffWelcomeEmail = async ({
  to,
  name,
}) => {
  const html = baseTemplate({
    title: `Welcome, ${name || "Applicant"}! 🎉`,

    bodyHtml: `
      <p>
        Your email has been successfully verified.
      </p>

      <p>
        You can now continue filling your staff application.
        Login with your credentials to proceed.
      </p>

      <p>
        Complete all 6 steps and submit your application for review.
      </p>
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
export const sendStaffApplicationSubmittedEmail = async ({
  to,
  name,
}) => {
  const html = baseTemplate({
    title: "Application Submitted Successfully ✅",

    bodyHtml: `
      <p>
        Hi <strong>${name || "Applicant"}</strong>,
      </p>

      <p>
        Your staff application has been submitted successfully.
        Our HR team will review it shortly.
      </p>

      <p style="margin-top:16px;">
        <strong>What happens next?</strong>
      </p>

      <ul>
        <li>Application review by HR (3-5 working days)</li>
        <li>Shortlisting and interview call</li>
        <li>Final decision</li>
      </ul>

      <p>
        You'll receive an email update on each step.
      </p>
    `,

    actionUrl: process.env.FRONT_END_URL,
    actionText: "Go to Portal",
    headerColor: "#16a34a",
  });

  return sendEmail({
    to,
    subject: "Application Submitted — Staff Recruitment",
    html,
  });
};
export const sendStaffApprovedEmail = async ({
  to,
  name,
  role,
  tempPassword,
  department,
  designation,
  joiningDate,
}) => {
  const appName =
    process.env.UNIVERSITY_NAME || "UMS Portal";

  const loginUrl =
    process.env.FRONT_END_URL ||
    "https://studentteacherportal.vercel.app";

  const contact =
    process.env.UNIVERSITY_CONTACT || "";

  const html = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8"/>
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
</head>

<body
  style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;"
>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="background:#f4f6f8;padding:40px 0;"
  >

    <tr>
      <td align="center">

        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"
        >

          <!-- HEADER -->
          <tr>
            <td
              style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:40px 32px;text-align:center;"
            >

              <div
                style="font-size:56px;line-height:1;margin-bottom:12px;"
              >
                🎉
              </div>

              <h1
                style="margin:0;color:#ffffff;font-size:26px;font-weight:700;"
              >
                Congratulations, ${name || "Applicant"}!
              </h1>

              <p
                style="margin:10px 0 0;color:#dcfce7;font-size:15px;"
              >
                Welcome to the team at ${appName}
              </p>

            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 32px;">

              <p
                style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 16px;"
              >
                Hi <strong>${name || "Applicant"}</strong>,
              </p>

              <p
                style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 24px;"
              >
                We are delighted to inform you that your application has been
                <strong style="color:#16a34a;">
                  APPROVED
                </strong>
                🎊
              </p>

              <!-- CREDENTIALS -->
              <div
                style="background:#f0fdf4;border-left:4px solid #16a34a;padding:20px;margin:0 0 24px;border-radius:8px;"
              >

                <p
                  style="margin:0 0 12px;font-weight:700;color:#166534;font-size:15px;"
                >
                  🔐 Your Login Credentials
                </p>

                <table
                  style="width:100%;font-size:14px;color:#374151;"
                >

                  <tr>
                    <td style="padding:6px 0;width:130px;">
                      <strong>Email:</strong>
                    </td>

                    <td style="padding:6px 0;">
                      ${to}
                    </td>
                  </tr>

                  <tr>
                    <td style="padding:6px 0;">
                      <strong>Password:</strong>
                    </td>

                    <td style="padding:6px 0;">

                      <code
                        style="background:#fff;padding:4px 10px;border-radius:4px;font-family:monospace;border:1px solid #d1fae5;color:#166534;font-weight:600;"
                      >
                        ${tempPassword || ""}
                      </code>

                    </td>
                  </tr>

                  <tr>
                    <td style="padding:6px 0;">
                      <strong>Role:</strong>
                    </td>

                    <td style="padding:6px 0;">
                      ${role || ""}
                    </td>
                  </tr>

                  ${
                    department
                      ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <strong>Department:</strong>
                          </td>

                          <td style="padding:6px 0;">
                            ${department}
                          </td>
                        </tr>
                      `
                      : ""
                  }

                  ${
                    designation
                      ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <strong>Designation:</strong>
                          </td>

                          <td style="padding:6px 0;">
                            ${designation}
                          </td>
                        </tr>
                      `
                      : ""
                  }

                  ${
                    joiningDate
                      ? `
                        <tr>
                          <td style="padding:6px 0;">
                            <strong>Joining Date:</strong>
                          </td>

                          <td style="padding:6px 0;">
                            ${joiningDate}
                          </td>
                        </tr>
                      `
                      : ""
                  }

                </table>

              </div>

              <!-- SECURITY WARNING -->
              <div
                style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 16px;margin:0 0 24px;border-radius:6px;"
              >

                <p
                  style="margin:0;color:#991b1b;font-size:13px;line-height:1.5;"
                >
                  ⚠️
                  <strong>Security Note:</strong>
                  Please change this password immediately after your first login.
                </p>

              </div>

              <!-- CTA -->
              <div
                style="text-align:center;margin:32px 0;"
              >

                <a
                  href="${loginUrl}"
                  style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:15px;"
                >
                  🚀 Login to Your Account
                </a>

              </div>

              <!-- JOINING MESSAGE -->
              <div
                style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:32px;"
              >

                <p
                  style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;"
                >
                  <strong>Welcome aboard! 🤝</strong>
                </p>

                <p
                  style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 12px;"
                >
                  We're thrilled to have you join our team.
                  Your skills and experience will be a valuable addition to
                  ${appName}.
                  We look forward to working together and achieving great things.
                </p>

                <p
                  style="color:#374151;font-size:15px;line-height:1.7;margin:0;"
                >
                  If you have any questions, feel free to reach out to us
                  ${
                    contact
                      ? `at <strong>${contact}</strong>`
                      : ""
                  }.
                </p>

              </div>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;"
            >

              <p
                style="margin:0 0 4px;color:#6b7280;font-size:14px;font-weight:600;"
              >
                ${appName}
              </p>

              <p
                style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;"
              >
                This is an automated message. Please do not reply.
                ${
                  contact
                    ? `<br/>Contact: ${contact}`
                    : ""
                }
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
`;

  return sendEmail({
    to,
    subject: `🎉 Welcome Aboard! Your Account is Approved — ${appName}`,
    html,
  });
};
export const sendStaffRejectedEmail = async ({
  to,
  name,
  reason,
  role,
}) => {
  const appName =
    process.env.UNIVERSITY_NAME || "UMS Portal";

  const contact =
    process.env.UNIVERSITY_CONTACT || "";

  const html = `
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8"/>
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
</head>

<body
  style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;"
>

  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    style="background:#f4f6f8;padding:40px 0;"
  >

    <tr>
      <td align="center">

        <table
          role="presentation"
          width="600"
          cellspacing="0"
          cellpadding="0"
          style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);"
        >

          <!-- HEADER -->
          <tr>
            <td
              style="background:linear-gradient(135deg,#475569,#64748b);padding:40px 32px;text-align:center;"
            >

              <div
                style="font-size:52px;line-height:1;margin-bottom:12px;"
              >
                📋
              </div>

              <h1
                style="margin:0;color:#ffffff;font-size:24px;font-weight:700;"
              >
                Application Status Update
              </h1>

              <p
                style="margin:10px 0 0;color:#e2e8f0;font-size:14px;"
              >
                ${appName}
              </p>

            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 32px;">

              <p
                style="color:#374151;font-size:16px;line-height:1.7;margin:0 0 16px;"
              >
                Dear <strong>${name || "Applicant"}</strong>,
              </p>

              <p
                style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;"
              >
                Thank you for taking the time to apply for the position
                ${
                  role
                    ? `<strong>${role}</strong>`
                    : ""
                }
                at ${appName}.
                We truly appreciate your interest in joining our team.
              </p>

              <p
                style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;"
              >
                After careful consideration of all applications,
                we regret to inform you that your application has
                <strong style="color:#dc2626;">
                  not been shortlisted
                </strong>
                at this time.
              </p>

              ${
                reason
                  ? `
                    <!-- REASON BOX -->
                    <div
                      style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;margin:0 0 24px;border-radius:8px;"
                    >

                      <p
                        style="margin:0 0 6px;font-weight:700;color:#991b1b;font-size:14px;"
                      >
                        📝 Feedback from our team:
                      </p>

                      <p
                        style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.6;"
                      >
                        ${reason}
                      </p>

                    </div>
                  `
                  : ""
              }

              <!-- ENCOURAGEMENT -->
              <p
                style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px;"
              >
                This decision does not diminish your skills or experience.
                We encourage you to keep developing your abilities and to
                apply again for future openings that match your profile.
              </p>

              <!-- TIPS BOX -->
              <div
                style="background:#f1f5f9;border-left:4px solid #475569;padding:16px 20px;margin:0 0 24px;border-radius:8px;"
              >

                <p
                  style="margin:0 0 10px;font-weight:700;color:#334155;font-size:14px;"
                >
                  💡 Suggestions for future applications:
                </p>

                <ul
                  style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;"
                >
                  <li>Gain more experience in the relevant field</li>
                  <li>Update your qualifications and certifications</li>
                  <li>Strengthen your CV and cover letter</li>
                  <li>Keep an eye on our careers page for new openings</li>
                </ul>

              </div>

              <!-- THANK YOU -->
              <p
                style="color:#374151;font-size:15px;line-height:1.7;margin:24px 0 0;"
              >
                We wish you the very best in your future endeavors.
              </p>

              <p
                style="color:#374151;font-size:15px;line-height:1.7;margin:16px 0 0;"
              >
                Warm regards,<br/>
                <strong>HR Team</strong><br/>
                ${appName}
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td
              style="background:#f9fafb;padding:24px 32px;text-align:center;border-top:1px solid #e5e7eb;"
            >

              <p
                style="margin:0 0 4px;color:#6b7280;font-size:14px;font-weight:600;"
              >
                ${appName}
              </p>

              <p
                style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;"
              >
                This is an automated message. Please do not reply.
                ${
                  contact
                    ? `<br/>Contact: ${contact}`
                    : ""
                }
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>

  </table>

</body>
</html>
`;

  return sendEmail({
    to,
    subject: `Application Status Update — ${appName}`,
    html,
  });
};
export const sendStaffPasswordResetEmail = async ({
  to,
  name,
  resetUrl,
}) => {
  const html = baseTemplate({
    title: "Reset Your Password",

    bodyHtml: `
      <p>
        Hi <strong>${name || "Applicant"}</strong>,
      </p>

      <p>
        We received a request to reset your staff account password.
        Click the button below to set a new password.
      </p>

      <p
        style="color:#dc2626;font-weight:500;margin-top:16px;"
      >
        ⏱️ This link is valid for
        <strong>15 minutes</strong>.
      </p>

      <p>
        If you didn't request this, you can safely ignore this email —
        your password won't change.
      </p>
    `,

    actionUrl: resetUrl,
    actionText: "Reset Password",
    headerColor: "#dc2626",
  });

  return sendEmail({
    to,
    subject: "Password Reset — Staff Account",
    html,
  });
};
export const sendStaffPasswordChangedEmail = async ({
  to,
  name,
  time,
}) => {
  const html = baseTemplate({
    title: "Your Password Was Changed",

    bodyHtml: `
      <p>
        Hi <strong>${name || "Applicant"}</strong>,
      </p>

      <p>
        Your staff account password was successfully changed.
      </p>

      <p style="margin-top:16px;">
        <strong>Time:</strong>
        ${time || new Date().toLocaleString()}
      </p>

      <p
        style="color:#dc2626;font-weight:500;margin-top:16px;"
      >
        ⚠️ If this wasn't you, contact your administrator immediately.
      </p>
    `,

    actionUrl: process.env.FRONT_END_URL,
    actionText: "Go to Portal",
    headerColor: "#dc2626",
  });

  return sendEmail({
    to,
    subject: "Security Alert — Staff Password Changed",
    html,
  });
};