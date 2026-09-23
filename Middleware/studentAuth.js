// Middleware/studentAuth.js
import jwt from "jsonwebtoken";
import User from "../Models/UserModel.js";
import Student from "../Models/StudentModel.js";

export const protectStudent = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "student") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Not a student token.",
        });
      }

      const user = await User.findById(decoded.id).select("-password");
      if (!user || user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: "User not found or deleted",
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
          message: "Email not verified",
        });
      }

      req.user = { id: user._id, email: user.email, roleSlug: user.roleSlug };
      req.student = { id: student._id };
      req.studentDoc = student;

      next();
    } catch (error) {
      console.error("protectStudent error:", error.message);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired" });
      }
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ success: false, message: "Invalid token" });
      }
      return res.status(401).json({ success: false, message: "Not authorized" });
    }
  } else {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};