// Controllers/Auth/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendAccountCreatedEmail,
} from "../../utils/emailService.js";

/* ============================================================
   HELPER: Generate JWT token
   ============================================================ */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      roleSlug: user.roleSlug,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );
};

/* ============================================================
   1. LOGIN
   POST /api/auth/login
   ============================================================ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .populate({
        path: "role",
        populate: { path: "permissions" },
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account has been deleted. Contact admin.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Contact admin.",
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "No password set for this account. Contact admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.role) {
      return res.status(403).json({
        success: false,
        message: "No role assigned. Contact admin.",
      });
    }

    if (!user.role.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your role is inactive. Contact admin.",
      });
    }

    const token = generateToken(user);

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role.name,
        roleSlug: user.roleSlug,
        permissions: user.role.permissions
          .filter((p) => p.isActive)
          .map((p) => p.key),
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/* ============================================================
   2. REGISTER (Admin creates user with password)
   POST /api/auth/register
   Body: { email, password, roleSlug, sendWelcome? }
   ============================================================ */
export const register = async (req, res) => {
  try {
    const { email, password, roleSlug, sendWelcome = true } = req.body;

    if (!email || !password || !roleSlug) {
      return res.status(400).json({
        success: false,
        message: "Email, password, and roleSlug are required",
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

    const role = await Role.findOne({ slug: roleSlug, isActive: true });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Active role "${roleSlug}" not found`,
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

    await user.populate({
      path: "role",
      populate: { path: "permissions" },
    });

    const token = generateToken(user);

    // Send welcome email (non-blocking)
    if (sendWelcome) {
      sendWelcomeEmail({
        to: user.email,
        name: user.email.split("@")[0],
        role: user.role.name,
        loginUrl: process.env.FRONT_END_URL,
      }).catch((err) =>
        console.error("Welcome email failed (non-fatal):", err.message)
      );
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role.name,
        roleSlug: user.roleSlug,
        permissions: user.role.permissions.map((p) => p.key),
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   3. ADMIN CREATE USER (auto-generate password + email)
   POST /api/auth/admin-create-user
   Body: { email, roleSlug, customPassword? }
   ============================================================ */
export const adminCreateUser = async (req, res) => {
  try {
    const { email, roleSlug, customPassword } = req.body;

    if (!email || !roleSlug) {
      return res.status(400).json({
        success: false,
        message: "Email and roleSlug are required",
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const role = await Role.findOne({ slug: roleSlug, isActive: true });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Active role "${roleSlug}" not found`,
      });
    }

    // Generate temp password if not provided
    const tempPassword =
      customPassword || crypto.randomBytes(4).toString("hex") + "@123";

    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role._id,
      roleSlug: role.slug,
      isActive: true,
      isDeleted: false,
    });

    await user.populate("role");

    // Send credentials email
    sendAccountCreatedEmail({
      to: user.email,
      name: user.email.split("@")[0],
      role: role.name,
      tempPassword,
      loginUrl: process.env.FRONT_END_URL,
    }).catch((err) =>
      console.error("Credentials email failed (non-fatal):", err.message)
    );

    return res.status(201).json({
      success: true,
      message: "User created. Credentials sent via email.",
      user: {
        _id: user._id,
        email: user.email,
        role: role.name,
        roleSlug: role.slug,
      },
      // ⚠️ dev only
      ...(process.env.NODE_ENV !== "production" && { tempPassword }),
    });
  } catch (err) {
    console.error("adminCreateUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   4. GET ME
   GET /api/auth/me
   ============================================================ */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password")
      .populate({
        path: "role",
        populate: { path: "permissions" },
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account deleted",
      });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role?.name || null,
        roleSlug: user.roleSlug,
        permissions:
          user.role?.permissions
            ?.filter((p) => p.isActive)
            .map((p) => p.key) || [],
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   5. LOGOUT
   POST /api/auth/logout
   ============================================================ */
export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logged out successfully. Please delete the token on client side.",
  });
};

/* ============================================================
   6. CHANGE PASSWORD
   PATCH /api/auth/change-password
   ============================================================ */
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "oldPassword and newPassword are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Old password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Send confirmation email (non-blocking)
    sendPasswordChangedEmail({
      to: user.email,
      name: user.email.split("@")[0],
      ip: req.ip,
      time: new Date().toLocaleString(),
    }).catch((err) =>
      console.error("Password change email failed (non-fatal):", err.message)
    );

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   7. FORGOT PASSWORD
   POST /api/auth/forgot-password
   ============================================================ */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Security: hamesha same response
    if (!user) {
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

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.FRONT_END_URL}/reset-password/${resetToken}`;

    // Send email (blocking — user should know it worked)
    try {
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
        name: user.email.split("@")[0],
      });
    } catch (emailErr) {
      console.error("Reset email failed:", emailErr.message);
      // Still continue — token saved in DB
    }

    console.log("🔗 Reset URL (dev):", resetUrl);

    return res.json({
      success: true,
      message: "If the email exists, a reset link has been sent.",
      // ⚠️ dev only
      ...(process.env.NODE_ENV !== "production" && { resetToken, resetUrl }),
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   8. RESET PASSWORD
   POST /api/auth/reset-password/:token
   ============================================================ */
export const resetPassword = async (req, res) => {
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

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    // Confirmation email
    sendPasswordChangedEmail({
      to: user.email,
      name: user.email.split("@")[0],
      time: new Date().toLocaleString(),
    }).catch((err) =>
      console.error("Password reset confirmation email failed:", err.message)
    );

    return res.json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};  