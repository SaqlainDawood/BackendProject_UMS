import nodemailer from "nodemailer";

// ✅ Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify (optional)
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email server error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

// ✅ YAHAN YE FUNCTION LIKHNA HAI
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
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Test Email",
      html: `<h2>Hello ${student.studentName}</h2>`
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.response);

  } catch (error) {
    console.log("❌ FULL ERROR:", error);
  }
};