// Controllers/CMS/permissionController.js
import Permission from "../../Models/PermissionModel.js";
import Role from "../../Models/RoleModel.js";

/* ============================================================
   1. GET ALL PERMISSIONS
   GET /api/cms/permissions
   ============================================================ */
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({
      category: 1,
      module: 1,
      action: 1,
    });
    return res.json({ success: true, count: permissions.length, permissions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET PERMISSIONS GROUPED BY MODULE
   GET /api/cms/permissions/grouped
   ============================================================ */
export const getPermissionsGrouped = async (req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true }).sort({
      category: 1,
      module: 1,
      action: 1,
    });

    const grouped = {};
    permissions.forEach((p) => {
      if (!grouped[p.category]) grouped[p.category] = {};
      if (!grouped[p.category][p.module]) grouped[p.category][p.module] = [];
      grouped[p.category][p.module].push({
        _id: p._id,
        key: p.key,
        action: p.action,
        label: p.label,
      });
    });

    return res.json({ success: true, grouped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. CREATE PERMISSION (optional — advanced admins)
   POST /api/cms/permissions
   ============================================================ */
export const createPermission = async (req, res) => {
  try {
    const { module, action, label, description = "", category = "general" } = req.body;

    if (!module || !action || !label) {
      return res.status(400).json({
        success: false,
        message: "module, action, label are required",
      });
    }

    const key = `${module.toLowerCase()}:${action.toLowerCase()}`;
    const existing = await Permission.findOne({ key });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Permission "${key}" already exists`,
      });
    }

    const permission = await Permission.create({
      module,
      action,
      key,
      label,
      description,
      category,
    });

    return res.status(201).json({ success: true, permission });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. DELETE PERMISSION
   DELETE /api/cms/permissions/:id
   ============================================================ */
export const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission not found" });
    }

    // Check if any role uses it
    const roleCount = await Role.countDocuments({ permissions: permission._id });
    if (roleCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete. ${roleCount} role(s) use this permission.`,
      });
    }

    await Permission.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Permission deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};