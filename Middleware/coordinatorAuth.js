import jwt from "jsonwebtoken";
import User from "../Models/CoordinatorModel.js";
import Coordinator from "../Models/CoordinatorModel.js";
export const CoordAuth = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startWith("Bearer")
  ) {
    console.log("Coordiantor Middleware Authentication");
    console.log("Authorization", req.headers.authorization);
    try {
      token = req.header.authorization.split(" ")[1];
      console.log("Token:", token.substring(0, 20) + "...");
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Coordinator Decoded Token ID :", decode.id);
      console.log("Coordinator Token", decode);
      if (!decode.id) {
        return res.status(401).json({
          success: false,
          message: "Invalid Coordiantor token payload",
        });
      }

      const user = await User.findById(decode.id).select("-password");
      console.log("User Found", user ? `Yes (${user.role})` : `No`);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "User account is deactivated",
        });
      }
      if (user.isDeleted) {
        return res.status(403).json({
          success: false,
          message: "User account is deleted",
        });
      }
      if (user.role !== "coordinator") {
        return res.status(403).json({
          success: fale,
          message: "Access denied you are not a coordiantor",
        });
      }
      const coordinator = await Coordinator.findOne({ user: user._id });
      if (!coordinator) {
        return res.status(404).json({
          success: false,
          message: "Coordinator Profile not found!!!",
        });
      }
      if (coordinator.isDeleted) {
        return res.status(403).json({
          success: false,
          message: "Coordinator profile is deleted",
        });
      }
      if (coordinator.status !== "active") {
        const statusMessage =
          coordinator.status === "on_leave"
            ? "Coordinator is currently on leave"
            : "Coordinator account is inactive";

        return res.status(403).json({
          success: false,
          message: statusMessage,
        });
      }
      
      req.user = user;
      req.coordinator = coordinator;
      next();
    } catch (error) {
      console.log("Coordinator Middleware Error:", error.message);
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token Expired",
        });
      } else if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Token Invalid",
        });
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
