import jwt from "jsonwebtoken";
import Staff from "../Models/StaffModel.js";
export const protectStaff = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // 2. Extract token
      token = req.headers.authorization.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided. Authorization denied.",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "staff") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Not a staff token.",
        });
      }

      const staff = await Staff.findById(decoded.id).select("-password");

      if (!staff) {
        return res.status(401).json({
          success: false,
          message: "Staff not found.",
        });
      }

      if (staff.isDeleted) {
        return res.status(401).json({
          success: false,
          message: "Staff account deleted.",
        });
      }

      // 6. Email verification check
      if (!staff.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email not verified. Please verify your email first.",
        });
      }

      // 7. Attach to request
      req.staff = {
        id: staff._id,
        email: staff.email,
      };
      req.staffDoc = staff;

      next();
    } catch (error) {
      console.error("protectStaff error:", error.message);

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token expired. Please login again.",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token.",
        });
      }

      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed.",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "No token, authorization denied.",
    });
  }
};

export const allowDraftOnly = (req, res, next) => {
  if (!req.staffDoc) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (req.staffDoc.isSubmitted) {
    return res.status(400).json({
      success: false,
      message: "Application already submitted. Cannot edit.",
    });
  }

  next();
};

/* ============================================================
   allowApprovedStaff (optional)
   - Only allow staff whose application is APPROVED
   - Useful for staff portal routes
   ============================================================ */
export const allowApprovedOnly = (req, res, next) => {
  if (!req.staffDoc) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  if (req.staffDoc.applicationStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Application not approved yet.",
    });
  }

  next();
};