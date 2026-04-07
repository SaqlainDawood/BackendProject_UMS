import SibApiV3Sdk from '@getbrevo/brevo';
import dotenv from 'dotenv';
dotenv.config();

console.log("=".repeat(50));
console.log("🔥 LOADING BREVO API EMAIL SERVICE");
console.log("=".repeat(50));
console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
console.log("BREVO_API_KEY length:", process.env.BREVO_API_KEY?.length);
console.log("BREVO_API_KEY first 20 chars:", process.env.BREVO_API_KEY?.substring(0, 20));
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("=".repeat(50));

// Initialize Brevo client
let apiInstance = null;

const initializeBrevo = () => {
  if (!apiInstance) {
    try {
      const defaultClient = SibApiV3Sdk.ApiClient.instance;
      const apiKey = defaultClient.authentications['api-key'];
      apiKey.apiKey = process.env.BREVO_API_KEY;
      apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      console.log("✅ Brevo API client initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Brevo client:", error);
      throw error;
    }
  }
  return apiInstance;
};

// Send approval email to a single student
export const sendApprovalEmail = async (student) => {
  console.log("📧 [BREVO API] Sending approval email to:", student.email);
  console.log("[BREVO API] Student name:", student.studentName);
  
  try {
    // Validate email
    if (!student.email) {
      console.log("❌ No email address provided");
      return { success: false, error: "No email address" };
    }

    // Initialize API client
    const api = initializeBrevo();
    
    // Create email object
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    // Sender information
    sendSmtpEmail.sender = {
      name: process.env.UNIVERSITY_NAME || "University of Education",
      email: process.env.EMAIL_USER || "a73db3001@smtp-brevo.com"
    };
    
    // Recipient
    sendSmtpEmail.to = [{
      email: student.email,
      name: student.studentName || "Student"
    }];
    
    // Email subject
    sendSmtpEmail.subject = `Admission Approved - ${process.env.UNIVERSITY_NAME}`;
    
    // Simple HTML content (avoid complex styles for testing)
    sendSmtpEmail.htmlContent = `
      <h2>Admission Approved! 🎉</h2>
      <p>Dear ${student.studentName},</p>
      <p>Congratulations! Your admission to <strong>${process.env.UNIVERSITY_NAME}</strong> has been approved.</p>
      <h3>Enrollment Details:</h3>
      <ul>
        <li><strong>Program:</strong> ${student.program || 'Not specified'}</li>
        <li><strong>Department:</strong> ${student.department || 'Not specified'}</li>
        <li><strong>Semester:</strong> ${student.semester || 'Not specified'}</li>
      </ul>
      <p>Login to portal: <a href="${process.env.FRONT_END_URL}">${process.env.FRONT_END_URL}</a></p>
      <p>Contact: ${process.env.UNIVERSITY_CONTACT}</p>
      <p>Regards,<br/>${process.env.UNIVERSITY_NAME}</p>
    `;
    
    sendSmtpEmail.textContent = `
      Dear ${student.studentName},
      
      Congratulations! Your admission to ${process.env.UNIVERSITY_NAME} has been approved.
      
      Enrollment Details:
      Program: ${student.program || 'Not specified'}
      Department: ${student.department || 'Not specified'}
      Semester: ${student.semester || 'Not specified'}
      
      Login: ${process.env.FRONT_END_URL}
      Contact: ${process.env.UNIVERSITY_CONTACT}
      
      Regards,
      ${process.env.UNIVERSITY_NAME}
    `;
    
    // Send email
    console.log("📤 Sending via Brevo API (HTTPS)...");
    const data = await api.sendTransacEmail(sendSmtpEmail);
    
    console.log("✅ Email sent successfully via Brevo API!");
    console.log("📧 Message ID:", data.messageId);
    
    return { 
      success: true, 
      messageId: data.messageId,
      email: student.email 
    };
    
  } catch (error) {
    console.error("❌ Brevo API Error:", error.message);
    
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response body:", JSON.stringify(error.response.body, null, 2));
      
      if (error.response.status === 401) {
        console.error("⚠️ Invalid API key! Check your BREVO_API_KEY");
      }
    }
    
    return { 
      success: false, 
      error: error.message
    };
  }
};

// Test function
export const testBrevoConnection = async (testEmail) => {
  console.log("🔧 Testing Brevo API connection...");
  
  const result = await sendApprovalEmail({
    studentName: "Test User",
    program: "Test Program",
    department: "Test Department",
    semester: "Test Semester",
    email: testEmail
  });
  
  return result;
};

export const sendBulkApprovalEmails = async (students) => {
  console.log(`📧 Sending bulk emails to ${students.length} students`);
  
  const results = { success: [], failed: [], total: students.length };
  
  for (const student of students) {
    const result = await sendApprovalEmail(student);
    if (result.success) {
      results.success.push(student.email);
    } else {
      results.failed.push({ email: student.email, error: result.error });
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};