import nodemailer from "nodemailer";

export const sendFacultyEmail = async (data) => {
  const {
    to,
    facultyName,
    employeeID,
    department,
    designation,
    userName,
    password,
    joiningDate
  } = data;

  console.log("📧 Starting email send process...");
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
  console.log("Email recipient:", to);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
await transporter.verify();
console.log("✅ Gmail SMTP connected successfully");

  // Login Link
  const loginURL = process.env.Front_END_URL+'admin/dashboard/faculty/login';

  const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: 'Arial', sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
          color: white; 
          padding: 30px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0 0;
          opacity: 0.9;
        }
        .content { 
          padding: 30px; 
        }
        .welcome-section {
          margin-bottom: 25px;
        }
        .details-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #667eea;
        }
        .credentials-card {
          background: #fff3e0;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #ff9800;
        }
        .login-btn {
          display: inline-block;
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          padding: 12px 30px;
          color: white;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .security-note {
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
          color: #856404;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          color: #666; 
          font-size: 14px;
          padding: 20px;
          background: #f8f9fa;
          border-top: 1px solid #e9ecef;
        }
        .detail-item {
          margin: 8px 0;
        }
        .detail-item strong {
          color: #555;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to University Management System</h1>
          <p>Your Faculty Account Has Been Created</p>
        </div>
        
        <div class="content">
          <div class="welcome-section">
            <h2>Dear ${facultyName},</h2>
            <p>Welcome to our university! Your faculty account has been successfully created and you can now access the faculty portal.</p>
          </div>

          <div class="details-card">
            <h3 style="color: #667eea; margin-top: 0;">📋 Faculty Details</h3>
            <div class="detail-item"><strong>Full Name:</strong> ${facultyName}</div>
            <div class="detail-item"><strong>Employee ID:</strong> ${employeeID}</div>
            <div class="detail-item"><strong>Department:</strong> ${department}</div>
            <div class="detail-item"><strong>Designation:</strong> ${designation}</div>
            <div class="detail-item"><strong>Joining Date:</strong> ${new Date(joiningDate).toLocaleDateString()}</div>
          </div>

          <div class="credentials-card">
            <h3 style="color: #ff9800; margin-top: 0;">🔐 Login Credentials</h3>
            <div class="detail-item"><strong>Username:</strong> ${userName}</div>
            <div class="detail-item"><strong>Password:</strong> ${password}</div>
          </div>

          <div class="security-note">
            <strong>🔒 Security Notice:</strong> For your account security, please change your password immediately after first login.
          </div>

          <div style="text-align: center;">
            <a href="${loginURL}" class="login-btn">
              🚀 Access Faculty Portal
            </a>
          </div>

          <p style="color: #666; line-height: 1.6;">
            If you encounter any issues while logging in or have questions about the portal, 
            please contact the IT support department at <strong>it-support@university.edu</strong>.
          </p>
        </div>

        <div class="footer">
          <p><strong>Best regards,</strong><br>University Administration Team</p>
          <p style="margin-top: 10px; font-size: 12px; color: #999;">
            This is an automated message. Please do not reply to this email.<br>
            © ${new Date().getFullYear()} University Management System
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"University Administration" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: `Welcome ${facultyName} - Your Faculty Account Credentials`,
    html: htmlTemplate
    // No attachments - PDF removed
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` Faculty credentials email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(' Email sending error:', error);
    throw new Error('Failed to send faculty credentials email');
  }
};