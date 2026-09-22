// // utils/emailService.js
// import axios from 'axios';
// import dotenv from 'dotenv';
// dotenv.config();

// console.log("=".repeat(50));
// console.log("🔥 LOADING BREVO EMAIL SERVICE (AXIOS VERSION)");
// console.log("=".repeat(50));
// console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
// console.log("BREVO_API_KEY length:", process.env.BREVO_API_KEY?.length);
// console.log("EMAIL_USER:", process.env.EMAIL_USER);
// console.log("FRONT_END_URL:", process.env.FRONT_END_URL);
// console.log("=".repeat(50));
// // Send approval email using direct API call
// export const sendApprovalEmail = async (student) => {
//     console.log(" Sending approval email to:", student.email);
//     console.log(" Student name:", student.studentName);
//     try {
//         // Validate email
//         if (!student.email) {
//             console.log(" No email address provided");
//             return { success: false, error: "No email address" };
//         }
//         const apiKey = process.env.BREVO_API_KEY;   
//         if (!apiKey) {
//             console.error(" BREVO_API_KEY is missing in environment variables!");
//             return { success: false, error: "API key missing" };
//         }
//         // Prepare email data
//         const emailData = {
//             sender: {
//                 name: process.env.UNIVERSITY_NAME || "University of Education",
//                 email: process.env.EMAIL_USER || "a73db3001@smtp-brevo.com"
//             },
//             to: [{
//                 email: student.email,
//                 name: student.studentName || "Student"
//             }],
//             subject: `Admission Approved - ${process.env.UNIVERSITY_NAME}`,
//             htmlContent: `
//                 <!DOCTYPE html>
//                 <html>
//                 <head>
//                     <meta charset="UTF-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>Admission Approved</title>
//                     <style>
//                         body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
//                         .container { max-width: 600px; margin: 0 auto; padding: 20px; }
//                         .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
//                         .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px; }
//                         .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
//                         .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
//                         .footer { margin-top: 20px; padding: 20px; text-align: center; font-size: 12px; color: #666; }
//                     </style>
//                 </head>
//                 <body>
//                     <div class="container">
//                         <div class="header">
//                             <h2>🎉 Admission Approved!</h2>
//                         </div>
//                         <div class="content">
//                             <h3>Dear ${student.studentName},</h3>
//                             <p>Congratulations! We are pleased to inform you that your admission to <strong>${process.env.UNIVERSITY_NAME}</strong> has been <strong style="color: #28a745;">approved</strong>.</p>
                            
//                             <div class="details">
//                                 <h4>📋 Enrollment Details:</h4>
//                                 <p><strong>Program:</strong> ${student.program || 'Not specified'}</p>
//                                 <p><strong>Department:</strong> ${student.department || 'Not specified'}</p>
//                                 <p><strong>Semester:</strong> ${student.semester || 'Not specified'}</p>
//                             </div>
                            
//                             <p>You can now login to the student portal to complete your registration and access university resources.</p>
                            
//                             <div style="text-align: center;">
//                                 <a href="${process.env.FRONT_END_URL}" class="button">🔐 Login to Portal</a>
//                             </div>
                            
//                             <p style="margin-top: 30px;">If you have any questions, please contact us at <strong>${process.env.UNIVERSITY_CONTACT}</strong></p>
//                         </div>
//                         <div class="footer">
//                             <p>&copy; ${new Date().getFullYear()} ${process.env.UNIVERSITY_NAME}. All rights reserved.</p>
//                             <p>This is an automated message, please do not reply directly to this email.</p>
//                         </div>
//                     </div>
//                 </body>
//                 </html>
//             `,
//             textContent: `
//                 Dear ${student.studentName},
                
//                 Congratulations! Your admission to ${process.env.UNIVERSITY_NAME} has been approved.
                
//                 Enrollment Details:
//                 Program: ${student.program || 'Not specified'}
//                 Department: ${student.department || 'Not specified'}
//                 Semester: ${student.semester || 'Not specified'}
                
//                 You can now login to the student portal: ${process.env.FRONT_END_URL}
                
//                 For questions, contact: ${process.env.UNIVERSITY_CONTACT}
                
//                 Regards,
//                 ${process.env.UNIVERSITY_NAME}
//             `
//         };

//         console.log(" Sending via Brevo API (HTTPS)...");
//         console.log(" To:", student.email);
//         console.log(" Subject:", emailData.subject);
        
//         // Send email using axios
//         const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
//             headers: {
//                 'Accept': 'application/json',
//                 'api-key': apiKey,
//                 'Content-Type': 'application/json'
//             },
//             timeout: 30000
//         });

//         console.log(" Email sent successfully!");
//         console.log(" Message ID:", response.data.messageId);
//         console.log(" Response Code:", response.status);
        
//         return {
//             success: true,
//             messageId: response.data.messageId,
//             email: student.email
//         };

//     } catch (error) {
//         console.error(" Brevo API Error:", error.message);
        
//         if (error.response) {
//             console.error("Response status:", error.response.status);
//             console.error("Response data:", JSON.stringify(error.response.data, null, 2));
            
//             if (error.response.status === 401) {
//                 console.error(" Invalid API key! Please check your BREVO_API_KEY in .env file");
//                 console.error("Your API key should start with 'xkeysib-' or 'xsmtpsib-'");
//             } else if (error.response.status === 400) {
//                 console.error(" Bad request - Check email format or sender email");
//             } else if (error.response.status === 429) {
//                 console.error(" Rate limit exceeded - Too many emails sent");
//             }
//         } else if (error.request) {
//             console.error("No response received from Brevo API");
//             console.error("Check your internet connection");
//         }
        
//         return {
//             success: false,
//             error: error.message,
//             details: error.response?.data
//         };
//     }
// };

// // Test email configuration
// export const testBrevoConnection = async (testEmail) => {
//     console.log("🔧 Testing Brevo API connection...");
//     console.log(" Test email:", testEmail);
    
//     if (!testEmail) {
//         console.log(" No test email provided");
//         return { success: false, error: "No test email provided" };
//     }
    
//     const result = await sendApprovalEmail({
//         studentName: "Test Student",
//         program: "Computer Science",
//         department: "Software Engineering",
//         semester: "Fall 2024",
//         email: testEmail
//     });
    
//     return result;
// };

// // Send bulk approval emails
// export const sendBulkApprovalEmails = async (students) => {
//     console.log(` Sending bulk emails to ${students.length} students`);
    
//     const results = { 
//         success: [], 
//         failed: [], 
//         total: students.length 
//     };
    
//     for (const student of students) {
//         const result = await sendApprovalEmail(student);
//         if (result.success) {
//             results.success.push(student.email);
//         } else {
//             results.failed.push({ 
//                 email: student.email, 
//                 error: result.error 
//             });
//         }
//         // Delay to avoid rate limiting (Brevo allows ~10 emails/second)
//         await new Promise(resolve => setTimeout(resolve, 500));
//     }
    
//     console.log(` Success: ${results.success.length},  Failed: ${results.failed.length}`);
//     return results;
// };

// utils/emailService.js
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

console.log("=".repeat(50));
console.log("🔥 LOADING BREVO EMAIL SERVICE (AXIOS VERSION)");
console.log("=".repeat(50));
console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
console.log("BREVO_API_KEY length:", process.env.BREVO_API_KEY?.length);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("FRONT_END_URL:", process.env.FRONT_END_URL);
console.log("=".repeat(50));

/* ============================================================
   HELPER: Brevo API URL
   ============================================================ */
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/* ============================================================
   HELPER: normalize recipients (string | array | object)
   ============================================================ */
const normalizeRecipients = (input) => {
  if (!input) return undefined;
  if (typeof input === "string") return [{ email: input }];
  if (Array.isArray(input))
    return input.map((r) => (typeof r === "string" ? { email: r } : r));
  return [input];
};

/* ============================================================
   CORE SENDER — generic email bhejne ke liye
   ============================================================ */
export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
  fromName,
  attachments,
  cc,
  bcc,
}) => {
  try {
    if (!to) throw new Error("'to' is required");
    if (!subject) throw new Error("'subject' is required");
    if (!html && !text) throw new Error("Either 'html' or 'text' is required");

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("BREVO_API_KEY missing");

    const payload = {
      sender: {
        email: from || process.env.EMAIL_USER,
        name: fromName || process.env.UNIVERSITY_NAME || "UMS Portal",
      },
      to: normalizeRecipients(to),
      subject,
      htmlContent: html || undefined,
      textContent: text || undefined,
    };

    if (cc) payload.cc = normalizeRecipients(cc);
    if (bcc) payload.bcc = normalizeRecipients(bcc);
    if (attachments?.length) payload.attachment = attachments;

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      timeout: 30000,
    });

    console.log(
      `✅ Email sent → ${JSON.stringify(to)} — msgId: ${
        response.data?.messageId || "N/A"
      }`
    );

    return {
      success: true,
      messageId: response.data?.messageId || null,
      data: response.data,
    };
  } catch (error) {
    const errMsg =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Unknown email error";

    console.error("❌ sendEmail error:", errMsg);
    if (error.response?.data) {
      console.error("   Brevo response:", JSON.stringify(error.response.data));
    }

    return { success: false, error: errMsg, details: error.response?.data };
  }
};

/* ============================================================
   BASE TEMPLATE (reusable HTML layout)
   ============================================================ */
const baseTemplate = ({
  title,
  bodyHtml,
  actionUrl,
  actionText,
  footerNote,
  headerColor = "#2563eb",
}) => {
  const appName = process.env.UNIVERSITY_NAME || "UMS Portal";
  const contact = process.env.UNIVERSITY_CONTACT || "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:${headerColor};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:0.5px;">
                ${appName}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 20px;color:#1f2937;font-size:20px;font-weight:600;">
                ${title}
              </h2>
              <div style="color:#374151;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </div>
              ${
                actionUrl && actionText
                  ? `
                <div style="text-align:center;margin:36px 0;">
                  <a href="${actionUrl}" 
                     style="display:inline-block;background:${headerColor};color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
                    ${actionText}
                  </a>
                </div>
                <p style="color:#6b7280;font-size:13px;text-align:center;margin:0 0 20px;">
                  Or copy this link:<br/>
                  <a href="${actionUrl}" style="color:${headerColor};word-break:break-all;">${actionUrl}</a>
                </p>
              `
                  : ""
              }
              ${
                footerNote
                  ? `<p style="color:#6b7280;font-size:13px;margin-top:24px;">${footerNote}</p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                This is an automated message. Please do not reply.<br/>
                ${contact ? `Contact: ${contact}` : ""}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/* ============================================================
   ✅ EXISTING FUNCTIONS (PURANE — WAISE HI RAKHEIN)
   ============================================================ */

/* ------------------------------------------------------------
   1. ADMISSION APPROVAL EMAIL (existing)
   ------------------------------------------------------------ */
export const sendApprovalEmail = async (student) => {
  console.log("📧 Sending approval email to:", student.email);
  console.log("👤 Student name:", student.studentName);
  try {
    if (!student.email) {
      console.log("❌ No email address provided");
      return { success: false, error: "No email address" };
    }
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      console.error("❌ BREVO_API_KEY is missing in environment variables!");
      return { success: false, error: "API key missing" };
    }

    const emailData = {
      sender: {
        name: process.env.UNIVERSITY_NAME || "University of Education",
        email: process.env.EMAIL_USER || "a73db3001@smtp-brevo.com",
      },
      to: [
        {
          email: student.email,
          name: student.studentName || "Student",
        },
      ],
      subject: `Admission Approved - ${process.env.UNIVERSITY_NAME}`,
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admission Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 10px 10px; }
            .details { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🎉 Admission Approved!</h2>
            </div>
            <div class="content">
              <h3>Dear ${student.studentName},</h3>
              <p>Congratulations! We are pleased to inform you that your admission to <strong>${process.env.UNIVERSITY_NAME}</strong> has been <strong style="color: #28a745;">approved</strong>.</p>
              
              <div class="details">
                <h4>📋 Enrollment Details:</h4>
                <p><strong>Program:</strong> ${student.program || "Not specified"}</p>
                <p><strong>Department:</strong> ${student.department || "Not specified"}</p>
                <p><strong>Semester:</strong> ${student.semester || "Not specified"}</p>
              </div>
              
              <p>You can now login to the student portal to complete your registration and access university resources.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONT_END_URL}" class="button">🔐 Login to Portal</a>
              </div>
              
              <p style="margin-top: 30px;">If you have any questions, please contact us at <strong>${process.env.UNIVERSITY_CONTACT}</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${process.env.UNIVERSITY_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply directly to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      textContent: `
        Dear ${student.studentName},
        
        Congratulations! Your admission to ${process.env.UNIVERSITY_NAME} has been approved.
        
        Enrollment Details:
        Program: ${student.program || "Not specified"}
        Department: ${student.department || "Not specified"}
        Semester: ${student.semester || "Not specified"}
        
        You can now login to the student portal: ${process.env.FRONT_END_URL}
        
        For questions, contact: ${process.env.UNIVERSITY_CONTACT}
        
        Regards,
        ${process.env.UNIVERSITY_NAME}
      `,
    };

    console.log("📤 Sending via Brevo API (HTTPS)...");
    console.log("   To:", student.email);
    console.log("   Subject:", emailData.subject);

    const response = await axios.post(BREVO_API_URL, emailData, {
      headers: {
        Accept: "application/json",
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    console.log("✅ Email sent successfully!");
    console.log("   Message ID:", response.data.messageId);
    console.log("   Response Code:", response.status);

    return {
      success: true,
      messageId: response.data.messageId,
      email: student.email,
    };
  } catch (error) {
    console.error("❌ Brevo API Error:", error.message);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response.data, null, 2)
      );

      if (error.response.status === 401) {
        console.error("❌ Invalid API key! Check BREVO_API_KEY in .env");
      } else if (error.response.status === 400) {
        console.error("❌ Bad request - Check email format or sender email");
      } else if (error.response.status === 429) {
        console.error("❌ Rate limit exceeded");
      }
    } else if (error.request) {
      console.error("❌ No response received from Brevo API");
    }

    return {
      success: false,
      error: error.message,
      details: error.response?.data,
    };
  }
};

/* ------------------------------------------------------------
   2. TEST BREVO CONNECTION (existing)
   ------------------------------------------------------------ */
export const testBrevoConnection = async (testEmail) => {
  console.log("🔧 Testing Brevo API connection...");
  console.log("   Test email:", testEmail);

  if (!testEmail) {
    console.log("❌ No test email provided");
    return { success: false, error: "No test email provided" };
  }

  return await sendApprovalEmail({
    studentName: "Test Student",
    program: "Computer Science",
    department: "Software Engineering",
    semester: "Fall 2024",
    email: testEmail,
  });
};

/* ------------------------------------------------------------
   3. BULK APPROVAL EMAILS (existing)
   ------------------------------------------------------------ */
export const sendBulkApprovalEmails = async (students) => {
  console.log(`📤 Sending bulk emails to ${students.length} students`);

  const results = {
    success: [],
    failed: [],
    total: students.length,
  };

  for (const student of students) {
    const result = await sendApprovalEmail(student);
    if (result.success) {
      results.success.push(student.email);
    } else {
      results.failed.push({
        email: student.email,
        error: result.error,
      });
    }
    // Delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(
    `✅ Success: ${results.success.length}, ❌ Failed: ${results.failed.length}`
  );
  return results;
};

/* ============================================================
   ✅ NEW FUNCTIONS (AUTH + USER MANAGEMENT)
   ============================================================ */

/* ------------------------------------------------------------
   4. WELCOME EMAIL (after registration)
   ------------------------------------------------------------ */
export const sendWelcomeEmail = async ({
  to,
  name = "User",
  role,
  loginUrl,
}) => {
  const html = baseTemplate({
    title: `Welcome aboard, ${name}! 🎓`,
    bodyHtml: `
      <p>Your account has been successfully created on <strong>${process.env.UNIVERSITY_NAME || "UMS Portal"}</strong>.</p>
      <p style="margin-top:16px;">
        <strong>Email:</strong> ${to}<br/>
        <strong>Role:</strong> ${role}
      </p>
      <p style="margin-top:16px;">You can now log in and start using the portal.</p>
    `,
    actionUrl: loginUrl || process.env.FRONT_END_URL,
    actionText: "Login to Portal",
    headerColor: "#16a34a",
  });

  return sendEmail({
    to,
    subject: `Welcome to ${process.env.UNIVERSITY_NAME || "UMS Portal"}`,
    html,
  });
};

/* ------------------------------------------------------------
   5. PASSWORD RESET EMAIL
   ------------------------------------------------------------ */
export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  name = "User",
}) => {
  const html = baseTemplate({
    title: "Password Reset Request",
    bodyHtml: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new password.</p>
      <p style="color:#dc2626;font-weight:500;margin-top:16px;">
        ⏱️ This link is valid for <strong>15 minutes</strong>.
      </p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `,
    actionUrl: resetUrl,
    actionText: "Reset Password",
    headerColor: "#dc2626",
  });

  return sendEmail({
    to,
    subject: "Password Reset Request",
    html,
  });
};

/* ------------------------------------------------------------
   6. PASSWORD CHANGED CONFIRMATION
   ------------------------------------------------------------ */
export const sendPasswordChangedEmail = async ({
  to,
  name = "User",
  ip,
  time,
}) => {
  const html = baseTemplate({
    title: "Your Password Was Changed",
    bodyHtml: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your account password was successfully changed.</p>
      <p style="margin-top:16px;">
        <strong>Time:</strong> ${time || new Date().toLocaleString()}<br/>
        ${ip ? `<strong>IP:</strong> ${ip}<br/>` : ""}
      </p>
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

/* ------------------------------------------------------------
   7. ACCOUNT CREATED (with temp credentials)
   ------------------------------------------------------------ */
export const sendAccountCreatedEmail = async ({
  to,
  name = "User",
  role,
  tempPassword,
  loginUrl,
}) => {
  const html = baseTemplate({
    title: "Your Account Is Ready 🎉",
    bodyHtml: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>An account has been created for you with the role: <strong>${role}</strong>.</p>
      <div style="background:#f3f4f6;border-left:4px solid #2563eb;padding:16px;margin:20px 0;border-radius:6px;">
        <p style="margin:0 0 8px;font-weight:600;color:#1f2937;">Your Login Credentials:</p>
        <p style="margin:4px 0;"><strong>Email:</strong> ${to}</p>
        <p style="margin:4px 0;"><strong>Temporary Password:</strong> <code style="background:#fff;padding:3px 8px;border-radius:4px;font-family:monospace;">${tempPassword}</code></p>
      </div>
      <p style="color:#dc2626;font-weight:500;">
        ⚠️ For security, please change your password after first login.
      </p>
    `,
    actionUrl: loginUrl || process.env.FRONT_END_URL,
    actionText: "Login Now",
    headerColor: "#2563eb",
  });

  return sendEmail({
    to,
    subject: "Your UMS Account Credentials",
    html,
  });
};

/* ------------------------------------------------------------
   8. ACCOUNT STATUS CHANGE
   ------------------------------------------------------------ */
export const sendAccountStatusEmail = async ({
  to,
  name = "User",
  isActive,
}) => {
  const html = baseTemplate({
    title: isActive
      ? "Your Account Was Activated"
      : "Your Account Was Deactivated",
    bodyHtml: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your UMS account has been <strong>${isActive ? "activated" : "deactivated"}</strong> by an administrator.</p>
      ${
        !isActive
          ? `<p style="color:#dc2626;">You will not be able to log in until it is activated again.</p>`
          : `<p>You can now log in and continue using the portal.</p>`
      }
    `,
    actionUrl: isActive ? process.env.FRONT_END_URL : null,
    actionText: isActive ? "Login to Portal" : null,
    headerColor: isActive ? "#16a34a" : "#dc2626",
  });

  return sendEmail({
    to,
    subject: isActive ? "Account Activated" : "Account Deactivated",
    html,
  });
};

/* ------------------------------------------------------------
   9. ROLE CHANGED NOTIFICATION
   ------------------------------------------------------------ */
export const sendRoleChangedEmail = async ({
  to,
  name = "User",
  newRole,
}) => {
  const html = baseTemplate({
    title: "Your Role Was Updated",
    bodyHtml: `
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your role has been changed to: <strong>${newRole}</strong>.</p>
      <p>Your new permissions will take effect on your next login.</p>
    `,
    actionUrl: process.env.FRONT_END_URL,
    actionText: "Go to Portal",
    headerColor: "#9333ea",
  });

  return sendEmail({
    to,
    subject: "Role Updated — UMS Portal",
    html,
  });
};

/* ------------------------------------------------------------
   10. GENERIC NOTIFICATION
   ------------------------------------------------------------ */
export const sendNotificationEmail = async ({
  to,
  subject,
  title,
  message,
  actionUrl,
  actionText,
}) => {
  const html = baseTemplate({
    title,
    bodyHtml: `<p>${message}</p>`,
    actionUrl,
    actionText,
  });

  return sendEmail({ to, subject, html });
};