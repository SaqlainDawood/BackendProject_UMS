import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter with better configuration
const createTransporter = () => {
  // Validate credentials
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("❌ EMAIL_USER or EMAIL_PASS is missing in environment variables");
    return null;
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false, // TLS required
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim(),
    },
    connectionTimeout: 30000, // Increased to 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
    debug: true, // Enable debug mode for Render logs
    logger: true, // Enable logging
  });
};

let transporter = createTransporter();

// Verify transporter with retry logic
export const verifyEmailConnection = async (retries = 3) => {
  if (!transporter) {
    console.error("❌ Transporter not created - check credentials");
    return false;
  }

  for (let i = 0; i < retries; i++) {
    try {
      await transporter.verify();
      console.log("✅ Email server ready and verified");
      return true;
    } catch (error) {
      console.log(`❌ Email verification attempt ${i + 1} failed:`, error.message);
      if (i === retries - 1) return false;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  return false;
};

// Test email function
export const testEmailConfig = async () => {
  console.log("📧 Testing email configuration...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
  console.log("UNIVERSITY_NAME:", process.env.UNIVERSITY_NAME);
  console.log("FRONT_END_URL:", process.env.FRONT_END_URL);

  const isVerified = await verifyEmailConnection();
  if (!isVerified) {
    console.error("❌ Email verification failed");
    return false;
  }
  return true;
};

// Send approval email with better error handling
export const sendApprovalEmail = async (student) => {
  console.log("📧 sendApprovalEmail called with:", {
    studentName: student.studentName,
    email: student.email,
    hasEmail: !!student.email
  });

  try {
    // Validate email
    const email = student.email;
    if (!email) {
      console.log("❌ No email address found for student");
      return { success: false, error: "No email address" };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return { success: false, error: "Invalid email format" };
    }

    // Recreate transporter if needed
    if (!transporter) {
      transporter = createTransporter();
      if (!transporter) {
        throw new Error("Failed to create email transporter");
      }
    }

    const mailOptions = {
      from: `"${process.env.UNIVERSITY_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Admission Approved - ${process.env.UNIVERSITY_NAME}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Admission Approved</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: #fff; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { margin-top: 20px; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Admission Approved! 🎉</h2>
            </div>
            <div class="content">
              <h3>Dear ${student.studentName},</h3>
              <p>Congratulations! Your admission has been <strong>approved</strong> to ${process.env.UNIVERSITY_NAME}.</p>
              
              <div class="details">
                <h4>Enrollment Details:</h4>
                <p><strong>Program:</strong> ${student.program || 'Not specified'}</p>
                <p><strong>Department:</strong> ${student.department || 'Not specified'}</p>
                <p><strong>Semester:</strong> ${student.semester || 'Not specified'}</p>
              </div>
              
              <p>You can now login to the student portal to complete your registration and access university resources.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONT_END_URL}" class="button">Login to Portal</a>
              </div>
              
              <p style="margin-top: 20px;">If you have any questions, please contact the admissions office at ${process.env.UNIVERSITY_CONTACT}.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${process.env.UNIVERSITY_NAME}. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${student.studentName},\n\nCongratulations! Your admission has been approved to ${process.env.UNIVERSITY_NAME}.\n\nProgram: ${student.program || 'Not specified'}\nDepartment: ${student.department || 'Not specified'}\nSemester: ${student.semester || 'Not specified'}\n\nYou can login to the student portal: ${process.env.FRONT_END_URL}\n\nFor questions, contact: ${process.env.UNIVERSITY_CONTACT}\n\nRegards,\n${process.env.UNIVERSITY_NAME}`,
    };

    console.log("📧 Attempting to send email to:", email);
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
    console.log("📧 Message ID:", info.messageId);
    console.log("📧 Response:", info.response);
    
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error("❌ Email sending failed:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    
    // Specific error handling
    if (error.code === 'EAUTH') {
      console.error("🔐 Authentication failed - Check EMAIL_USER and EMAIL_PASS");
    } else if (error.code === 'ECONNECTION') {
      console.error("🔌 Connection failed - Check network/SMTP settings");
    } else if (error.code === 'ESOCKET') {
      console.error("💻 Socket timeout - Increase timeouts or check internet");
    }
    
    return { success: false, error: error.message };
  }
};

// Re-verify connection every hour
setInterval(async () => {
  await verifyEmailConnection();
}, 3600000);