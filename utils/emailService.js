// utils/emailService.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

console.log("=".repeat(50));
console.log("🔥 LOADING BREVO EMAIL SERVICE (AXIOS VERSION)");
console.log("=".repeat(50));
console.log("BREVO_API_KEY exists:", !!process.env.BREVO_API_KEY);
console.log("BREVO_API_KEY length:", process.env.BREVO_API_KEY?.length);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("FRONT_END_URL:", process.env.FRONT_END_URL);
console.log("=".repeat(50));
// Send approval email using direct API call
export const sendApprovalEmail = async (student) => {
    console.log(" Sending approval email to:", student.email);
    console.log(" Student name:", student.studentName);
    try {
        // Validate email
        if (!student.email) {
            console.log(" No email address provided");
            return { success: false, error: "No email address" };
        }
        const apiKey = process.env.BREVO_API_KEY;   
        if (!apiKey) {
            console.error(" BREVO_API_KEY is missing in environment variables!");
            return { success: false, error: "API key missing" };
        }
        // Prepare email data
        const emailData = {
            sender: {
                name: process.env.UNIVERSITY_NAME || "University of Education",
                email: process.env.EMAIL_USER || "a73db3001@smtp-brevo.com"
            },
            to: [{
                email: student.email,
                name: student.studentName || "Student"
            }],
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
                                <p><strong>Program:</strong> ${student.program || 'Not specified'}</p>
                                <p><strong>Department:</strong> ${student.department || 'Not specified'}</p>
                                <p><strong>Semester:</strong> ${student.semester || 'Not specified'}</p>
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
                Program: ${student.program || 'Not specified'}
                Department: ${student.department || 'Not specified'}
                Semester: ${student.semester || 'Not specified'}
                
                You can now login to the student portal: ${process.env.FRONT_END_URL}
                
                For questions, contact: ${process.env.UNIVERSITY_CONTACT}
                
                Regards,
                ${process.env.UNIVERSITY_NAME}
            `
        };

        console.log(" Sending via Brevo API (HTTPS)...");
        console.log(" To:", student.email);
        console.log(" Subject:", emailData.subject);
        
        // Send email using axios
        const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
            headers: {
                'Accept': 'application/json',
                'api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log(" Email sent successfully!");
        console.log(" Message ID:", response.data.messageId);
        console.log(" Response Code:", response.status);
        
        return {
            success: true,
            messageId: response.data.messageId,
            email: student.email
        };

    } catch (error) {
        console.error(" Brevo API Error:", error.message);
        
        if (error.response) {
            console.error("Response status:", error.response.status);
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
            
            if (error.response.status === 401) {
                console.error(" Invalid API key! Please check your BREVO_API_KEY in .env file");
                console.error("Your API key should start with 'xkeysib-' or 'xsmtpsib-'");
            } else if (error.response.status === 400) {
                console.error(" Bad request - Check email format or sender email");
            } else if (error.response.status === 429) {
                console.error(" Rate limit exceeded - Too many emails sent");
            }
        } else if (error.request) {
            console.error("No response received from Brevo API");
            console.error("Check your internet connection");
        }
        
        return {
            success: false,
            error: error.message,
            details: error.response?.data
        };
    }
};

// Test email configuration
export const testBrevoConnection = async (testEmail) => {
    console.log("🔧 Testing Brevo API connection...");
    console.log(" Test email:", testEmail);
    
    if (!testEmail) {
        console.log(" No test email provided");
        return { success: false, error: "No test email provided" };
    }
    
    const result = await sendApprovalEmail({
        studentName: "Test Student",
        program: "Computer Science",
        department: "Software Engineering",
        semester: "Fall 2024",
        email: testEmail
    });
    
    return result;
};

// Send bulk approval emails
export const sendBulkApprovalEmails = async (students) => {
    console.log(` Sending bulk emails to ${students.length} students`);
    
    const results = { 
        success: [], 
        failed: [], 
        total: students.length 
    };
    
    for (const student of students) {
        const result = await sendApprovalEmail(student);
        if (result.success) {
            results.success.push(student.email);
        } else {
            results.failed.push({ 
                email: student.email, 
                error: result.error 
            });
        }
        // Delay to avoid rate limiting (Brevo allows ~10 emails/second)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(` Success: ${results.success.length},  Failed: ${results.failed.length}`);
    return results;
};