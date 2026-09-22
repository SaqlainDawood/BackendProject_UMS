// Middleware/checkPermission.js
import User from "../Models/UserModel.js";

/**
 * Usage:
 *   router.post("/students", authMiddleware, checkPermission("student:add"), handler);
 *   router.get("/students", authMiddleware, checkPermission("student:view"), handler);
 *
 * OR for multiple permissions (any one required):
 *   checkPermission("student:view", "student:add")
 */
export const checkPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    try {
      // 1. User must be attached by authMiddleware
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized. Please login.",
        });
      }

      // 2. Fetch user with populated role + permissions
      const user = await User.findById(req.user.id).populate({
        path: "role",
        populate: { path: "permissions" },
      });

      if (!user || user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: "User not found or deleted.",
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is inactive. Contact admin.",
        });
      }

      // 3. Role must exist and be active
      if (!user.role || !user.role.isActive) {
        return res.status(403).json({
          success: false,
          message: "Your role is inactive or missing.",
        });
      }

      // 4. Super Admin bypass — always allowed
      if (user.roleSlug === "super-admin") {
        req.userRole = user.role;
        return next();
      }

      // 5. Collect permission keys from role
      const userPermissionKeys = user.role.permissions
        .filter((p) => p.isActive)
        .map((p) => p.key);

      // 6. Check if user has ANY of the required permissions
      const hasAccess = requiredPermissions.some((perm) =>
        userPermissionKeys.includes(perm)
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${requiredPermissions.join(" OR ")}`,
          yourPermissions: userPermissionKeys,
        });
      }

      // 7. Attach for downstream use
      req.userRole = user.role;
      req.userPermissions = userPermissionKeys;
      next();
    } catch (err) {
      console.error("❌ checkPermission error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error in permission check.",
      });
    }
  };
};