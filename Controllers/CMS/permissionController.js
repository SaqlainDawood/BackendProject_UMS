// Controllers/CMS/permissionController.js
import Permission from "../../Models/PermissionModel.js";

/* ============================================================
   1. GET ALL PERMISSIONS (flat list)
   GET /api/cms/permissions
   ============================================================ */
export const getAllPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find({ isActive: true })
      .sort({ category: 1, module: 1, action: 1 })
      .lean();

    return res.json({ success: true, count: permissions.length, permissions });
  } catch (err) {
    console.error("getAllPermissions error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET PERMISSIONS GROUPED
   GET /api/cms/permissions/grouped                  → module → actions
   GET /api/cms/permissions/grouped?groupBy=category → category → module → actions
   ============================================================ */
export const getPermissionsGrouped = async (req, res) => {
  try {
    const { groupBy = "module" } = req.query;

    const permissions = await Permission.find({ isActive: true })
      .sort({ category: 1, module: 1, action: 1 })
      .lean();

    const grouped = {};

    permissions.forEach((p) => {
      const item = {
        _id: p._id,
        key: p.key,
        action: p.action,
        label: p.label,
      };

      if (groupBy === "category") {
        grouped[p.category] ||= {};
        (grouped[p.category][p.module] ||= []).push(item);
      } else {
        (grouped[p.module] ||= []).push({ ...item, category: p.category });
      }
    });

    return res.json({
      success: true,
      count: permissions.length,
      grouped,
    });
  } catch (err) {
    console.error("getPermissionsGrouped error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. GET PERMISSION BY ID
   GET /api/cms/permissions/:id
   ============================================================ */
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid permission id" });
    }

    const permission = await Permission.findById(id).lean();

    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission not found" });
    }

    return res.json({ success: true, permission });
  } catch (err) {
    console.error("getPermissionById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};