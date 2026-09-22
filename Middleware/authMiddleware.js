import jwt from "jsonwebtoken";
import User from "../Models/UserModel.js";
import Student from "../Models/StudentModel.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }

      if (user.roleSlug !== "student") {
        return res.status(403).json({
          success: false,
          message: "Access denied: Not a student account",
        });
      }

      const student = await Student.findOne({ user: user._id });
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student profile not found",
        });
      }

      req.user = user;
      req.student = student;
      console.log("Student attached to req:", student._id);
      next();
    } catch (error) {
      console.error("protect middleware error:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired" });
      }
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};

export const authMiddleware = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return res.status(401).json({ success: false, message: "User not found" });
      }
      if (user.isDeleted) {
        return res.status(401).json({ success: false, message: "Account deleted" });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account inactive. Contact admin.",
        });
      }

      req.user = {
        id: user._id,
        email: user.email,
        roleSlug: user.roleSlug,
      };
      next();
    } catch (error) {
      console.error("authMiddleware error:", error);

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired" });
      }
      return res
        .status(401)
        .json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};