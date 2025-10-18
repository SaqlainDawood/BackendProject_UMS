import jwt from "jsonwebtoken";
import Admin from '../Models/AdminModel.js'

export const protectAdmin = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.admin = await Admin.findById(decoded.id).select("-password");

      if (!req.admin) {
        return res.status(401).json({ success: false, message: "Admin not found" });
      }

      
      if (req.admin.role !== "admin") {
        return res.status(403).json({ success: false, message: "Access denied: Not an admin" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ success: false, message: "No token, authorization denied" });
  }
};
