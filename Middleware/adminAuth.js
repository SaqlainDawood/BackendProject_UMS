import jwt from "jsonwebtoken";
import User from "../Models/UserModel.js";

export const protectAdmin = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided. Authorization denied.",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: "Account deleted",
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account inactive",
        });
      }

      // ✅ roleSlug check (not hardcoded "admin")
      const allowedSlugs = ["admin", "super-admin"];
      if (!allowedSlugs.includes(user.roleSlug)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin only.",
        });
      }

      // ❌ Admin profile lookup hata dein — ab User hi kaafi hai
      // const admin = await Admin.findOne({ user: user._id });
      // if (!admin) { ... }  ← ye khatam

      req.user = user;
      next();
    } catch (error) {
      console.log("JWT Verification Error!!", error.message);
      if (error.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ success: false, message: "Token expired" });
      } else if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ success: false, message: "Invalid token" });
      } else {
        return res
          .status(401)
          .json({ success: false, message: "Not authorized, token failed" });
      }
    }
  } else {
    return res
      .status(401)
      .json({ success: false, message: "No token, authorization denied" });
  }
};