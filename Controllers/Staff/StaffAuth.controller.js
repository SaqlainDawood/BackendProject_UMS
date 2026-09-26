// Controllers/Staff/StaffAuthController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Staff from "../../Models/StaffModel.js";
import {
  sendStaffVerificationEmail,
  sendStaffWelcomeEmail,
  sendStaffPasswordResetEmail,
  sendStaffPasswordChangedEmail,
  
} from "../../utils/staffEmailService.js";

/* ============================================================
   HELPER: JWT for Staff
   ============================================================ */
const generateStaffToken = (staff) => {
  return jwt.sign(
    { id: staff._id, email: staff.email, type: "staff" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "5h" }
  );
};

/* ============================================================
   1. SIGNUP
   POST /api/staff/signup
   Body: { email, password }
   ============================================================ */
export const staffSignup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const existing = await Staff.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered as staff applicant",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    const staff = await Staff.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      emailVerificationToken: verifyTokenHash,
      emailVerificationExpire: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      isEmailVerified: false,
      applicationStatus: "draft",
      currentStep: 1,
    });

    // Send verification email
    const verifyUrl = `${process.env.FRONT_END_URL}/staff/verify-email/${verifyToken}`;

    sendStaffVerificationEmail({
      to: staff.email,
      name: "Applicant",
      verifyUrl,
    }).catch((err) => console.error("Verification email failed:", err.message));

    return res.status(201).json({
      success: true,
      message: "Signup successful. Please check your email to verify.",
      staffId: staff._id,
      // ⚠️ dev only
      ...(process.env.NODE_ENV !== "production" && { verifyToken, verifyUrl }),
    });
  } catch (err) {
    console.error("staffSignup error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. VERIFY EMAIL
   Supports both POST /api/staff/verify-email/:token (existing)
   and GET/POST /api/staff/verify-email?token=... for frontend links
   ============================================================ */
export const staffVerifyEmail = async (req, res) => {
  try {
    // Accept token from params (existing) or query (frontend may call)
    const token = req.params.token || req.query.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const staff = await Staff.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    if (staff.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    staff.isEmailVerified = true;
    staff.emailVerificationToken = null;
    staff.emailVerificationExpire = null;
    await staff.save();

    // Send welcome email
    sendStaffWelcomeEmail({
      to: staff.email,
      name: staff.step1_personalInfo?.fullName || "Applicant",
    }).catch((err) => console.error("Welcome email failed:", err.message));

    return res.json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (err) {
    console.error("staffVerifyEmail error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. LOGIN
   POST /api/staff/login
   Body: { email, password }
   ============================================================ */
export const staffLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase().trim() });

    if (!staff || staff.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!staff.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first. Check your inbox.",
      });
    }

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateStaffToken(staff);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      staff: {
        _id: staff._id,
        email: staff.email,
        applicationStatus: staff.applicationStatus,
        currentStep: staff.currentStep,
        completedSteps: staff.completedSteps,
        isSubmitted: staff.isSubmitted,
      },
    });
  } catch (err) {
    console.error("staffLogin error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. GET ME
   GET /api/staff/me
   ============================================================ */
export const staffGetMe = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff.id).select("-password");
    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }
    return res.json({ success: true, staff });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. RESEND VERIFICATION
   POST /api/staff/resend-verification
   Body: { email }
   ============================================================ */
export const staffResendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase().trim() });

    if (!staff) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a verification link has been sent.",
      });
    }

    if (staff.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    // New token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    staff.emailVerificationToken = verifyTokenHash;
    staff.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await staff.save();

    const verifyUrl = `${process.env.FRONT_END_URL}/staff/verify-email/${verifyToken}`;

    await sendStaffVerificationEmail({
      to: staff.email,
      name: "Applicant",
      verifyUrl,
    });

    return res.json({
      success: true,
      message: "Verification email sent.",
      ...(process.env.NODE_ENV !== "production" && { verifyToken, verifyUrl }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   FORGOT PASSWORD
   POST /api/staff/forgot-password
   Body: { email }
   ============================================================ */
export const staffForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const staff = await Staff.findOne({ email: email.toLowerCase().trim() });

    // Security: hamesha same response
    if (!staff || staff.isDeleted) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    staff.resetPasswordToken = resetTokenHash;
    staff.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
    await staff.save();

    const BACKEND_URL =
      process.env.BACKEND_URL ||
      `http://localhost:${process.env.PORT || 8000}`;
    const resetUrl = `${BACKEND_URL}/api/staff/reset-password/${resetToken}`;

    // Send email
    try {
      await sendStaffPasswordResetEmail({
        to: staff.email,
        name: staff.step1_personalInfo?.fullName || "Applicant",
        resetUrl,
      });
      console.log("✅ Staff reset email sent:", staff.email);
    } catch (emailErr) {
      console.error("❌ Staff reset email failed:", emailErr.message);
    }

    return res.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
      ...(process.env.NODE_ENV !== "production" && { resetToken, resetUrl }),
    });
  } catch (err) {
    console.error("staffForgotPassword error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   RESET PASSWORD (API — POST)
   POST /api/staff/reset-password/:token
   Body: { password }
   ============================================================ */
export const staffResetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const staff = await Staff.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    staff.password = await bcrypt.hash(password, 10);
    staff.resetPasswordToken = null;
    staff.resetPasswordExpire = null;
    await staff.save();

    // Confirmation email
    sendStaffPasswordChangedEmail({
      to: staff.email,
      name: staff.step1_personalInfo?.fullName || "Applicant",
      time: new Date().toLocaleString(),
    }).catch((err) =>
      console.error("Password changed email failed:", err.message)
    );

    return res.json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (err) {
    console.error("staffResetPassword error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   RESET PASSWORD PAGE (HTML — GET)
   GET /api/staff/reset-password/:token
   ============================================================ */
export const showStaffResetPasswordPage = async (req, res) => {
  try {
    const { token } = req.params;

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const staff = await Staff.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    const isValid = !!staff;

    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Reset Password — Staff</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 40px;
      max-width: 420px;
      width: 100%;
    }
    h1 { color: #1f2937; font-size: 24px; margin-bottom: 8px; }
    p { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
    label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
    }
    input:focus { outline: none; border-color: #2563eb; }
    button {
      width: 100%;
      padding: 14px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { background: #1d4ed8; }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
    .success { background: #dcfce7; color: #166534; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Reset Your Password</h1>
    <p>Enter a new password for your staff account.</p>

    <div id="alert" class="hidden"></div>

    ${
      !isValid
        ? `<div class="error">This reset link is invalid or has expired. Please request a new one.</div>
           <a href="${process.env.FRONT_END_URL}" style="display:block;text-align:center;margin-top:20px;color:#2563eb;">Back to Portal</a>`
        : `
      <form id="resetForm">
        <label>New Password</label>
        <input type="password" id="password" placeholder="Min 6 characters" required minlength="6" />
        <label>Confirm Password</label>
        <input type="password" id="confirmPassword" placeholder="Re-enter password" required minlength="6" />
        <button type="submit" id="submitBtn">Reset Password</button>
      </form>
    `
    }
  </div>

  <script>
    const form = document.getElementById("resetForm");
    const alertBox = document.getElementById("alert");

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("password").value;
        const confirm = document.getElementById("confirmPassword").value;
        const btn = document.getElementById("submitBtn");

        alertBox.classList.add("hidden");

        if (password !== confirm) {
          alertBox.className = "error";
          alertBox.textContent = "Passwords do not match!";
          alertBox.classList.remove("hidden");
          return;
        }

        btn.disabled = true;
        btn.textContent = "Resetting...";

        try {
          const res = await fetch(window.location.pathname, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
          });
          const data = await res.json();

          if (data.success) {
            alertBox.className = "success";
            alertBox.textContent = "✅ Password reset successful! Redirecting...";
            alertBox.classList.remove("hidden");
            form.classList.add("hidden");
            setTimeout(() => {
              window.location.href = "${process.env.FRONT_END_URL}";
            }, 2000);
          } else {
            alertBox.className = "error";
            alertBox.textContent = data.message || "Failed to reset password.";
            alertBox.classList.remove("hidden");
            btn.disabled = false;
            btn.textContent = "Reset Password";
          }
        } catch (err) {
          alertBox.className = "error";
          alertBox.textContent = "Network error. Try again.";
          alertBox.classList.remove("hidden");
          btn.disabled = false;
          btn.textContent = "Reset Password";
        }
      });
    }
  </script>
</body>
</html>
    `);
  } catch (err) {
    console.error("showStaffResetPasswordPage error:", err);
    return res.status(500).send(`
      <h1 style="color:red;text-align:center;padding:50px;">Server Error</h1>
    `);
  }
};