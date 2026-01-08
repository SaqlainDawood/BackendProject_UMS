import nodemailer from "nodemailer";

// Create transporter (using Gmail)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendApprovalEmail = async (student) => {
  try {
   
     const transporter = createTransporter();
      console.log("📋 Student object in sendApprovalEmail:", JSON.stringify(student, null, 2));
    
    // Extract email properly
    const email = student.email || (student.user && student.user.email);
    
    
    console.log("🔍 Extracted email:", email);
    console.log("🔍 student.email:", student.email);
    console.log("🔍 student.user?.email:", student.user?.email);
       if (!email) {
      throw new Error("No email address found for student");
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Congratulations! Your Admission to ${
        process.env.UNIVERSITY_NAME || "University"
      } Has Been Approved`,
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #43e97b; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Admission Approved!</h1>
            <p>Welcome to ${process.env.UNIVERSITY_NAME || "University"}</p>
          </div>
          <div class="content">
            <h2>Dear ${student.studentName},</h2>
            <p>Congratulations! We are pleased to inform you that your admission application has been approved.</p>
            
            <div class="details">
              <h3>Your Admission Details:</h3>
              <p><strong>Student Name:</strong> ${student.studentName}</p>
              <p><strong>Program:</strong> ${student.program}</p>
              <p><strong>Department:</strong> ${student.department}</p>
              <p><strong>Semester:</strong> ${student.semester}</p>
              <p><strong>Session:</strong> ${student.session}</p>
              
              <h3 style="color: #43e97b; margin-top: 20px;">Login Credentials:</h3>
              <p><strong>Username:</strong> ${student.userName}</p>
              <p><strong>Password:</strong> ${student.password}</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Login to your student portal</li>
              <li>Complete your profile</li>
              <li>View your class schedule</li>
              <li>Access learning materials</li>
            </ul>
            
            <p><strong>Access Portal:</strong> <a href="${
              process.env.PORTAL_URL || "http://localhost:3000/student-login"
            }" style="color: #43e97b;">Student Login Portal</a></p>
            
            <p>We look forward to having you as part of our academic community!</p>
            
            <p>Best regards,<br><strong>Admission Office</strong><br>
            ${process.env.UNIVERSITY_NAME || "University"}</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Approval email sent to ${email}`);
    return true;
  } catch (error) {
      console.error("❌ Email sending error:", error.message);
    console.error("❌ Full error:", error);
    throw new Error("Failed to send approval email");
  }
};
