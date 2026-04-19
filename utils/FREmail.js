// utils/FREmail.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log("=".repeat(50));
console.log("🔥 LOADING BREVO FACULTY EMAIL SERVICE");
console.log("=".repeat(50));
console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("=".repeat(50));

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

  console.log("📧 Sending faculty email via Brevo API to:", to);
  console.log("👤 Faculty name:", facultyName);

  try {
    // Validate email
    if (!to) {
      console.log("❌ No email address provided");
      throw new Error("No email address provided");
    }

    const apiKey = process.env.BREVO_API_KEY;
    
    if (!apiKey) {
      console.error("❌ BREVO_API_KEY is missing!");
      throw new Error("API key missing");
    }

    const loginURL = process.env.Front_END_URL || process.env.FRONT_END_URL;
    const finalLoginURL = `${loginURL}/admin/dashboard/faculty/login`;

    // Prepare email data
    const emailData = {
      sender: {
        name: process.env.UNIVERSITY_NAME || "University of Education",
        email: process.env.EMAIL_USER || "saqlaindawood00@gmail.com" // Your verified Gmail
      },
      to: [{
        email: to,
        name: facultyName || "Faculty Member"
      }],
      subject: `Welcome ${facultyName} - Your Faculty Account Credentials`,
      htmlContent: `
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
                <a href="${finalLoginURL}" class="login-btn">
                  🚀 Access Faculty Portal
                </a>
              </div>

              <p style="color: #666; line-height: 1.6;">
                If you encounter any issues while logging in or have questions about the portal, 
                please contact the IT support department.
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
      `,
      textContent: `
        Welcome ${facultyName} to University Management System!
        
        Your faculty account has been created.
        
        Faculty Details:
        - Full Name: ${facultyName}
        - Employee ID: ${employeeID}
        - Department: ${department}
        - Designation: ${designation}
        - Joining Date: ${new Date(joiningDate).toLocaleDateString()}
        
        Login Credentials:
        - Username: ${userName}
        - Password: ${password}
        
        Login URL: ${finalLoginURL}
        
        Security Notice: Please change your password after first login.
        
        Regards,
        University Administration Team
      `
    };

    console.log("📤 Sending faculty email via Brevo API (HTTPS)...");
    console.log("📧 To:", to);
    
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
      headers: {
        'Accept': 'application/json',
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log("✅ Faculty email sent successfully!");
    console.log("📧 Message ID:", response.data.messageId);
    console.log("📧 Response Code:", response.status);
    
    return true;

  } catch (error) {
    console.error("❌ Brevo API Error:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error("⚠️ Invalid API key! Check BREVO_API_KEY in .env");
      } else if (error.response.status === 400) {
        console.error("⚠️ Bad request - Check sender email or recipient");
      }
    }
    
    throw new Error(`Failed to send faculty credentials email: ${error.message}`);
  }
};