// Controllers/Student/StudentAuthController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import Student from "../../Models/StudentModel.js";
import {
  sendStudentVerificationEmail,
  sendStudentWelcomeEmail,
  sendStudentPasswordResetEmail,
  sendStudentPasswordChangedEmail,
} from "../../utils/studentEmailService.js";

/* ============================================================
   HELPER: JWT for Student
   ============================================================ */
const generateStudentToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      type: "student", // ← important
    },
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const role = await Role.findOne({ slug: "student", isActive: true });
    if (!role) {
      return res.status(500).json({
        success: false,
        message: "Student role not configured. Contact admin.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role._id,
      roleSlug: role.slug,
      isActive: true,
      isDeleted: false,
    });

    // Create empty Student draft
    const student = await Student.create({
      user: user._id,
      status: "draft",
      isComplete: false,
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

    // Email
    const BACKEND_URL =
      process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8000}`;
    const verifyUrl = `${BACKEND_URL}/api/students/verify-email/${verifyToken}`;

    sendStudentVerificationEmail({
      to: user.email,
      name: "Student",
      verifyUrl,
    }).catch((err) => console.error("Verification email failed:", err.message));

    return res.status(201).json({
      success: true,
      message: "Signup successful. Please check your email to verify.",
      userId: user._id,
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

    const user = await User.findById(student.user);
    sendStudentWelcomeEmail({
      to: user.email,
      name: "Student",
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Contact admin.",
      });
    }

    if (user.roleSlug !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Not a student account",
      });
    }

    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    if (!student.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email first. Check your inbox.",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "No password set. Contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateStudentToken(user);

    user.lastLogin = new Date();
    await user.save();

    return res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        roleSlug: user.roleSlug,
      },
      student: {
        _id: student._id,
        status: student.status,
        lastStepCompleted: student.lastStepCompleted,
        isComplete: student.isComplete,
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
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const student = await Student.findOne({ user: user._id });

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        roleSlug: user.roleSlug,
      },
      student: student
        ? {
            _id: student._id,
            status: student.status,
            lastStepCompleted: student.lastStepCompleted,
            isComplete: student.isComplete,
          }
        : null,
    });
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

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        success: true,
        message: "If the email exists, a verification link has been sent.",
      });
    }

    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified",
      });
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
      to: user.email,
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
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({
        success: true,
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const student = await Student.findOne({ user: user._id });
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
      to: user.email,
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

    const user = await User.findById(student.user);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    student.resetPasswordToken = null;
    student.resetPasswordExpire = null;
    await student.save();

    sendStudentPasswordChangedEmail({
      to: user.email,
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