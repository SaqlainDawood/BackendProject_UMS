import nodemailer from "nodemailer";

// ✅ TRANSPORTER (Render + Gmail FIXED)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,           // TLS port
  secure: false,       // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ✅ VERIFY CONNECTION
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email server error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

// ✅ SEND EMAIL FUNCTION
export const sendApprovalEmail = async (student) => {
  console.log("📧 FUNCTION STARTED");

  try {
    const email = student.email || student.user?.email;

    console.log("📧 Email:", email);

    if (!email) {
      console.log("❌ No email found");
      return;
    }

    const mailOptions = {
      from: `"${process.env.UNIVERSITY_NAME}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Admission Approved - ${process.env.UNIVERSITY_NAME}`,
      html: `
        <h2>Dear ${student.studentName}</h2>
        <p>Your admission has been <b>approved</b>.</p>

        <p><b>Program:</b> ${student.program}</p>
        <p><b>Department:</b> ${student.department}</p>
        <p><b>Semester:</b> ${student.semester}</p>

        <br/>
        <a href="${process.env.FRONT_END_URL}">Login Portal</a>

        <p>Regards,<br/>${process.env.UNIVERSITY_NAME}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.response);

  } catch (error) {
    console.log("❌ FULL EMAIL ERROR:", error);
  }
};