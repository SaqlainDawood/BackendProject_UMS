import nodemailer from "nodemailer";

// ✅ GLOBAL transporter (ek hi baar banega)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ✅ Verify connection (optional but recommended)
transporter.verify((error, success) => {
  if (error) {
    console.log("❌ Email server error:", error);
  } else {
    console.log("✅ Email server ready");
  }
});

// ✅ Send Email Function
export const sendApprovalEmail = async (student) => {
  try {
    const email = student.email || student.user?.email;

    if (!email) {
      console.log("❌ No email found");
      return;
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Admission Approved - ${process.env.UNIVERSITY_NAME}`,
      html: `
        <h2>Dear ${student.studentName}</h2>
        <p>Your admission has been <b>approved</b>.</p>

        <p><b>Program:</b> ${student.program}</p>
        <p><b>Department:</b> ${student.department}</p>
        <p><b>Semester:</b> ${student.semester}</p>

        <br/>
        <a href="${process.env.PORTAL_URL}">Login Portal</a>

        <p>Regards,<br/>${process.env.UNIVERSITY_NAME}</p>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent:", info.response);

  } catch (error) {
    console.log("❌ Email error:", error.message);
  }
};