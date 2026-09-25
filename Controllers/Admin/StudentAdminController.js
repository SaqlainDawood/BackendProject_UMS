// Controllers/Admin/StudentAdminController.js
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import Student from "../../Models/StudentModel.js";

/* ============================================================
   GET ALL STUDENTS (UserModel role=student → StudentModel profile)
   GET /api/admin/students
   Query: ?search=ali&isActive=true&page=1&limit=20
   Permission: student:view
   ============================================================ */
export const getAllStudentUsers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;

    // 1) "student" role ki id nikalo
    const studentRole = await Role.findOne({ slug: "student" });
    if (!studentRole) {
      return res.status(404).json({
        success: false,
        message: "Student role not configured",
      });
    }

    // 2) User model se sary students (role match) uthao
    const userFilter = {
      role: studentRole._id,
      isDeleted: false,
    };
    if (isActive !== undefined) userFilter.isActive = isActive === "true";

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select("-password -emailVerificationToken -resetPasswordToken")
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(userFilter),
    ]);

    const userIds = users.map((u) => u._id);

    // 3) In users ke corresponding Student profiles uthao (user field se match)
    const students = await Student.find({ user: { $in: userIds } })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester");

    // 4) User._id → Student doc ka map bana lo, taake merge fast ho
    const studentByUserId = new Map(
      students.map((s) => [s.user.toString(), s])
    );

    // 5) User + Student merge karke ek combined profile banao
    let result = users.map((u) => {
      const profile = studentByUserId.get(u._id.toString()) || null;
      return {
        userId: u._id,
        email: u.email,
        isActive: u.isActive,
        roleSlug: u.roleSlug,
        createdAt: u.createdAt,
        student: profile, // pura student profile (personalInfo, rollNo, registrationNo, batch, dept, etc.)
      };
    });

    // 6) Search (name/email/cnic/rollNo) — in-memory filter
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((r) => {
        const s = r.student;
        const fullName = `${s?.personalInfo?.firstName || ""} ${s?.personalInfo?.lastName || ""}`.toLowerCase();
        return (
          r.email?.toLowerCase().includes(searchLower) ||
          fullName.includes(searchLower) ||
          s?.personalInfo?.cnic?.includes(search) ||
          s?.rollNo?.toLowerCase().includes(searchLower) ||
          s?.registrationNo?.toLowerCase().includes(searchLower)
        );
      });
    }

    return res.json({
      success: true,
      count: result.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      page: Number(page),
      students: result,
    });
  } catch (err) {
    console.error("getAllStudentUsers error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   GET SINGLE STUDENT BY USER ID
   GET /api/admin/students/:userId
   Permission: student:view
   ============================================================ */
export const getStudentUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "-password -emailVerificationToken -resetPasswordToken"
    );
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const student = await Student.findOne({ user: user._id })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    return res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        isActive: user.isActive,
        roleSlug: user.roleSlug,
        student,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};