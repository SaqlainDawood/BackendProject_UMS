import User from "../../Models/UserModel.js";
import Teacher from "../../Models/Teacher.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    const currentUser = req.user;
    const roleSlug = String(currentUser?.roleSlug || "").toLowerCase();
    const allowedAdminRoleSlugs = ["admin", "super-admin", "superadmin"];

    if (!currentUser || !allowedAdminRoleSlugs.includes(roleSlug)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    const [totalStudents, totalFaculty, pendingApprovals] = await Promise.all([
      User.countDocuments({
        roleSlug: "student",
        isDeleted: false,
        isActive: true,
      }),
      Teacher.countDocuments({ isActive: true }),
      User.countDocuments({
        roleSlug: "student",
        isDeleted: false,
        isActive: false,
      }),
    ]);

    const payload = {
      success: true,
      totalStudents,
      totalFaculty,
      pendingApprovals,
      todayAttendance: 0,
      activities: [],
      events: [],
      stats: {
        totalStudents,
        totalFaculty,
        pendingApprovals,
        todayAttendance: 0,
      },
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error("getAdminDashboardStats error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load dashboard stats",
    });
  }
};
