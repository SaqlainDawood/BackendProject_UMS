// Controllers/CMS/roleController.js
import Role from "../../Models/RoleModel.js";
import Permission from "../../Models/PermissionModel.js";
import User from "../../Models/UserModel.js";

/* ============================================================
   HELPER: slugify role name
   "Exam Hall Staff" → "exam-hall-staff"
   ============================================================ */
const slugify = (str) =>
  str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

/* ============================================================
   1. CREATE ROLE
   POST /api/cms/roles
   Body: { name, description, permissions: ["student:view", ...] }
   ============================================================ */
export const createRole = async (req, res) => {
  try {
    const { name, description = "", permissions = [] } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const slug = slugify(name);

    const existing = await Role.findOne({
      $or: [{ name }, { slug }],
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Role "${name}" already exists`,
      });
    }

    // Convert permission keys → ObjectIds
    let permissionIds = [];
    if (permissions.length) {
      const perms = await Permission.find({ key: { $in: permissions } });
      if (perms.length !== permissions.length) {
        const found = perms.map((p) => p.key);
        const missing = permissions.filter((p) => !found.includes(p));
        return res.status(400).json({
          success: false,
          message: `Invalid permissions: ${missing.join(", ")}`,
        });
      }
      permissionIds = perms.map((p) => p._id);
    }

    const role = await Role.create({
      name,
      slug,
      description,
      permissions: permissionIds,
      isSystemRole: false,
      isActive: true,
      createdBy: req.user?.id || null,
    });

    const populated = await role.populate("permissions");

    return res.status(201).json({
      success: true,
      message: "Role created successfully",
      role: populated,
    });
  } catch (err) {
    console.error("createRole error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. LIST ALL ROLES
   GET /api/cms/roles
   ============================================================ */
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find({})
      .populate("permissions")
      .sort({ isSystemRole: -1, name: 1 });

    // Attach user count per role
    const roleIds = roles.map((r) => r._id);
    const userCounts = await User.aggregate([
      { $match: { role: { $in: roleIds } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]);
    const countMap = {};
    userCounts.forEach((u) => (countMap[u._id.toString()] = u.count));

    const result = roles.map((r) => ({
      ...r.toObject(),
      userCount: countMap[r._id.toString()] || 0,
    }));

    return res.json({ success: true, count: result.length, roles: result });
  } catch (err) {
    console.error("getAllRoles error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. GET SINGLE ROLE
   GET /api/cms/roles/:id
   ============================================================ */
export const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id).populate("permissions");
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }
    return res.json({ success: true, role });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. UPDATE ROLE (name / description)
   PUT /api/cms/roles/:id
   ============================================================ */
export const updateRole = async (req, res) => {
  try {
    const { name, description } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // System roles: name can't change (slug safety)
    if (role.isSystemRole && name && name !== role.name) {
      return res.status(400).json({
        success: false,
        message: "System role name cannot be changed",
      });
    }

    if (name) {
      role.name = name;
      if (!role.isSystemRole) role.slug = slugify(name);
    }
    if (description !== undefined) role.description = description;

    await role.save();
    await role.populate("permissions");

    return res.json({ success: true, message: "Role updated", role });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. UPDATE ROLE PERMISSIONS
   PATCH /api/cms/roles/:id/permissions
   Body: { permissions: ["student:view", "student:add"] }
   ============================================================ */
export const updateRolePermissions = async (req, res) => {
  try {
    const { permissions = [] } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    // System roles: only super-admin's permissions cannot be modified
    if (role.slug === "super-admin") {
      return res.status(400).json({
        success: false,
        message: "Super Admin permissions cannot be modified",
      });
    }

    // Validate permission keys
    const perms = await Permission.find({ key: { $in: permissions } });
    if (perms.length !== permissions.length) {
      const found = perms.map((p) => p.key);
      const missing = permissions.filter((p) => !found.includes(p));
      return res.status(400).json({
        success: false,
        message: `Invalid permissions: ${missing.join(", ")}`,
      });
    }

    role.permissions = perms.map((p) => p._id);
    await role.save();
    await role.populate("permissions");

    return res.json({
      success: true,
      message: "Role permissions updated",
      role,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   6. TOGGLE ROLE ACTIVE
   PATCH /api/cms/roles/:id/toggle
   ============================================================ */
export const toggleRoleStatus = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deactivated",
      });
    }

    role.isActive = !role.isActive;
    await role.save();

    return res.json({
      success: true,
      message: `Role ${role.isActive ? "activated" : "deactivated"}`,
      role,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   7. DELETE ROLE
   DELETE /api/cms/roles/:id
   ============================================================ */
export const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found" });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: "System roles cannot be deleted",
      });
    }

    // Check if any user is using this role
    const userCount = await User.countDocuments({ role: role._id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${userCount} user(s) are assigned this role.`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Role deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};