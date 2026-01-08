import jwt from "jsonwebtoken";
import Admin from "../Models/AdminModel.js";
import User from "../Models/userModel.js";
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
          message: "Not token Provided. Authorization Denied.",
        });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");
      if (!user) {
        return res.status(401).json({
          succes: false,
          message: "User not found",
        });
      }
      if (user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Amdin only!!!",
        });
      }
      const admin = await Admin.findOne({ user: user._id });
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: "Admin Profile not found",
        });
      }
      req.user = user;
      req.admin = admin;
      // req.admin = await Admin.findById(decoded.id).select("-password");

      // if (!req.admin) {
      //   return res.status(401).json({ success: false, message: "Admin not found" });
      // }

      // if (req.admin.role !== "admin") {
      //   return res.status(403).json({ success: false, message: "Access denied: Not an admin" });
      // }

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
