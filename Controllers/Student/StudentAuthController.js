// Controllers/Student/StudentAuthController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Student from "../../Models/StudentModel.js";
import {
  sendStudentVerificationEmail,
  sendStudentWelcomeEmail,
  sendStudentPasswordResetEmail,
  sendStudentPasswordChangedEmail,
} from "../../utils/studentEmailService.js";

/* HELPER: Generate JWT */
const generateStudentToken = (student) => {
  return jwt.sign(
    { id: student._id, email: student.email, type: "student" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

/* ============================================================
   1. SIGNUP
   POST /api/students/signup
   Body: { email, password }
   ============================================================ */
export const studentSignup = async (req, res) => {
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

    const existing = await Student.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isEmailVerified: false,
      lastStepCompleted: 0,
    });

    // Verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    student.emailVerificationToken = verifyTokenHash;
    student.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await student.save();

    const BACKEND_URL =
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const verifyUrl = `${BACKEND_URL}/api/students/verify-email/${verifyToken}`;

    sendStudentVerificationEmail({
      to: student.email,
      name: "Student",
      verifyUrl,
    }).catch((err) => console.error("Verification email failed:", err.message));

    return res.status(201).json({
      success: true,
      message: "Signup successful. Please check your email to verify.",
      studentId: student._id,
      ...(process.env.NODE_ENV !== "production" && { verifyToken, verifyUrl }),
    });
  } catch (err) {
    console.error("studentSignup error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. VERIFY EMAIL
   POST /api/students/verify-email/:token
   ============================================================ */
export const studentVerifyEmail = async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const student = await Student.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpire: { $gt: Date.now() },
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    if (student.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
    }

    student.isEmailVerified = true;
    student.emailVerificationToken = null;
    student.emailVerificationExpire = null;
    await student.save();

    sendStudentWelcomeEmail({
      to: student.email,
      name: student.personalInfo?.firstName || "Student",
    }).catch((err) => console.error("Welcome email failed:", err.message));

    return res.json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (err) {
    console.error("studentVerifyEmail error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. LOGIN
   POST /api/students/login
   Body: { email, password }
   ============================================================ */
export const studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const student = await Student.findOne({ email: email.toLowerCase().trim() });

    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!student.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first. Check your inbox.",
      });
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateStudentToken(student);

    student.lastLogin = new Date();
    await student.save();

    return res.json({
      success: true,
      message: "Login successful",
      token,
      student: {
        _id: student._id,
        email: student.email,
        firstName: student.personalInfo?.firstName || "",
        lastName: student.personalInfo?.lastName || "",
        isEmailVerified: student.isEmailVerified,
        lastStepCompleted: student.lastStepCompleted,
        completedSteps: student.completedSteps,
        isProfileComplete: student.isProfileComplete,
        hasUserAccount: !!student.user,
      },
    });
  } catch (err) {
    console.error("studentLogin error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. GET ME
   GET /api/students/me
   ============================================================ */
export const studentGetMe = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .populate("user", "email roleSlug isActive");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.json({ success: true, student });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. RESEND VERIFICATION
   POST /api/students/resend-verification
   Body: { email }
   ============================================================ */
export const studentResendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const student = await Student.findOne({ email: email.toLowerCase().trim() });
    if (!student) {
      return res.json({
        success: true,
        message: "If the email exists, a verification link has been sent.",
      });
    }

    if (student.isEmailVerified) {
      return res.status(400).json({ success: false, message: "Email already verified" });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    student.emailVerificationToken = verifyTokenHash;
    student.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000;
    await student.save();

    const BACKEND_URL =
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const verifyUrl = `${BACKEND_URL}/api/students/verify-email/${verifyToken}`;

    await sendStudentVerificationEmail({
      to: student.email,
      name: "Student",
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
   6. FORGOT PASSWORD
   POST /api/students/forgot-password
   Body: { email }
   ============================================================ */
export const studentForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const student = await Student.findOne({ email: email.toLowerCase().trim() });
    if (!student) {
      return res.json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    student.resetPasswordToken = resetTokenHash;
    student.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await student.save();

    const BACKEND_URL =
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const resetUrl = `${BACKEND_URL}/api/students/reset-password/${resetToken}`;

    await sendStudentPasswordResetEmail({
      to: student.email,
      name: "Student",
      resetUrl,
    });

    return res.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
      ...(process.env.NODE_ENV !== "production" && { resetToken, resetUrl }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   7. RESET PASSWORD
   POST /api/students/reset-password/:token
   Body: { password }
   ============================================================ */
export const studentResetPassword = async (req, res) => {
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

    const student = await Student.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    student.password = await bcrypt.hash(password, 10);
    student.resetPasswordToken = null;
    student.resetPasswordExpire = null;
    await student.save();

    sendStudentPasswordChangedEmail({
      to: student.email,
      name: "Student",
      time: new Date().toLocaleString(),
    }).catch((err) => console.error("Email failed:", err.message));

    return res.json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};