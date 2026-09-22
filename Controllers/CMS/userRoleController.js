// Controllers/CMS/userRoleController.js
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";

/* ============================================================
   1. ASSIGN ROLE TO USER
   PATCH /api/cms/users/:userId/assign-role
   Body: { roleSlug: "clerk" }
   ============================================================ */
export const assignRoleToUser = async (req, res) => {
  try {
    const { roleSlug } = req.body;
    if (!roleSlug) {
      return res.status(400).json({ success: false, message: "roleSlug is required" });
    }

    const role = await Role.findOne({ slug: roleSlug, isActive: true });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Active role "${roleSlug}" not found`,
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.role = role._id;
    user.roleSlug = role.slug;
    await user.save();

    await user.populate({ path: "role", populate: { path: "permissions" } });

    return res.json({
      success: true,
      message: `Role assigned: ${role.name}`,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role.name,
        roleSlug: user.roleSlug,
        permissionsCount: user.role.permissions.length,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET USER'S EFFECTIVE PERMISSIONS
   GET /api/cms/users/:userId/permissions
   ============================================================ */
export const getUserPermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate({
      path: "role",
      populate: { path: "permissions" },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role?.name || null,
        roleSlug: user.roleSlug,
      },
      permissions: user.role?.permissions?.map((p) => p.key) || [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};