import jwt from "jsonwebtoken";
import Faculty from "../Models/TeacherModel.js";
import User from '../Models/userModel.js'

export const protectFaculty = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization && req.headers.authorization.startsWith("Bearer")
  ) {
    console.log("=== Middleware Debug ===");
    console.log("Authorization:", req.headers.authorization);
    try {
       token = req.headers.authorization.split(" ")[1];
       console.log("Token:", token.substring(0, 20) + "...");
       const decode = jwt.verify(token, process.env.JWT_SECRET);
       console.log("Decoded faculty token ID:", decode.id);
       console.log("Decoded faculty token:", decode);
        if (!decode.id) {
        return res.status(401).json({
          success: false,
          message: "Invalid faculty token payload",
        });
      }
      const user = await User.findById(decode.id).select("-password");
         console.log("User found:", user ? `Yes (${user.role})` : "No");
    
       if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }
    if(user.role !== 'faculty'){
      return res.status(403).json({
        success:false,
        message:"Access denied: Not a faculty account",
      })
    }
      const faculty = await Faculty.findOne({user:user._id});
      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }
      if(faculty.status !== 'Active'){
           return res.status(403).json({ 
          success: false, 
          message: "Teacher account is not active" 
        });
      }
       req.user = user;
      req.faculty = faculty;

      next();
    } 
    catch (error) {
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
