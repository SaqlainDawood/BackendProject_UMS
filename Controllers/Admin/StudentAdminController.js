// Controllers/Admin/StudentAdminController.js
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import Student from "../../Models/StudentModel.js";
import Application from "../../Models/ApplicationModel.js";
import Enrollment from "../../Models/Enrollment.js";

const normalizeStudentStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["active", "approved", "pending", "rejected", "suspend", "suspended", "inactive", "unassigned", "assign"].includes(normalized)) {
    return normalized === "suspend" || normalized === "suspended" ? "suspend" : normalized;
  }

  if (normalized === "draft") return "pending";
  if (!normalized) return "active";
  return normalized;
};

const buildNormalizedStudent = (studentDoc, userDoc, applicationDoc, enrollmentDoc) => {
  const student = studentDoc ? (studentDoc.toObject ? studentDoc.toObject() : studentDoc) : {};
  const user = userDoc ? (userDoc.toObject ? userDoc.toObject() : userDoc) : {};
  const application = applicationDoc ? (applicationDoc.toObject ? applicationDoc.toObject() : applicationDoc) : {};
  const enrollment = enrollmentDoc ? (enrollmentDoc.toObject ? enrollmentDoc.toObject() : enrollmentDoc) : {};

  const appBatch = application.batchId || enrollment.batchId || null;
  const batch = appBatch && typeof appBatch === "object" ? appBatch : null;
  const deptName = application.departmentId?.name || batch?.departmentId?.name || "";
  const semesterValue = application.batchId?.currentSemester ?? batch?.currentSemester ?? enrollment.batchId?.currentSemester ?? "";
  const sessionName = batch?.startSessionId?.year || application.batchId?.startSessionId?.year || "";

  return {
    ...student,
    _id: student._id || user._id,
    userId: user._id || student.user || null,
    email: user.email || student.email || application.student?.email || "",
    firstName: student.personalInfo?.firstName || "",
    lastName: student.personalInfo?.lastName || "",
    phoneNo: student.personalInfo?.phoneNo || "",
    cnic: student.personalInfo?.cnic || "",
    DOB: student.personalInfo?.DOB || null,
    gender: student.personalInfo?.gender || "",
    bloodGroup: student.personalInfo?.bloodGroup || "",
    maritalStatus: student.personalInfo?.maritalStatus || "",
    religion: student.personalInfo?.religion || "",
    nationality: student.personalInfo?.nationality || "",
    province: student.addressInfo?.province || "",
    domicile: student.addressInfo?.domicile || "",
    presentAddress: student.addressInfo?.presentAddress || "",
    permanentAddress: student.addressInfo?.permanentAddress || "",
    status: normalizeStudentStatus(application.status || enrollment.status || "active"),
    rollNo: application.rollNo || "",
    registrationNo: application.registrationNo || "",
    section: application.section || "",
    cgpa: application.cgpa ?? null,
    profileImage: student.personalInfo?.profileImage || null,
    family: student.familyInfo || {},
    enrollment: {
      program: application.program || "",
      semester: semesterValue || "",
      session: sessionName || "",
      department: deptName || "",
      shift: application.shiftId?.name || batch?.shiftId?.name || "",
      campus: application.campusId?.name || "",
      appliedOn: application.submittedAt || application.createdAt || null,
    },
    user: user ? {
      _id: user._id,
      email: user.email,
      roleSlug: user.roleSlug,
      isActive: user.isActive,
    } : (student.user ? { _id: student.user } : null),
  };
};

/* ============================================================
   GET ALL STUDENTS (UserModel role=student → StudentModel profile)
   GET /api/admin/students
   Query: ?search=ali&isActive=true&page=1&limit=20
   Permission: student:view
   ============================================================ */
export const getAllStudentUsers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;

    const studentRole = await Role.findOne({ slug: "student" });
    if (!studentRole) {
      return res.status(404).json({
        success: false,
        message: "Student role not configured",
      });
    }

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

    const [students, applications, enrollments] = await Promise.all([
      Student.find({ user: { $in: userIds } })
        .populate("user", "email roleSlug isActive"),
      Application.find({ student: { $in: studentIdsFromUsers(userIds) } })
        .populate("campusId", "name")
        .populate("departmentId", "name")
        .populate("degreeClassId", "name")
        .populate("shiftId", "name")
        .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] }),
      Enrollment.find({ studentId: { $in: studentIdsFromUsers(userIds) } })
        .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] }),
    ]);

    const studentByUserId = new Map(
      students.map((s) => [s.user?._id?.toString() || s.user?.toString(), s])
    );
    const appByStudentId = new Map(
      applications.map((app) => [app.student?.toString(), app])
    );
    const enrollmentByStudentId = new Map(
      enrollments.map((enrollment) => [enrollment.studentId?.toString(), enrollment])
    );

    let result = users.map((u) => {
      const profile = studentByUserId.get(u._id.toString()) || null;
      const studentProfile = buildNormalizedStudent(
        profile,
        u,
        appByStudentId.get(profile?._id?.toString()),
        enrollmentByStudentId.get(profile?._id?.toString())
      );

      return {
        ...studentProfile,
        userId: u._id,
        email: u.email,
        isActive: u.isActive,
        roleSlug: u.roleSlug,
        createdAt: u.createdAt,
      };
    });

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((student) => {
        const fullName = `${student.firstName || ""} ${student.lastName || ""}`.toLowerCase();
        return (
          student.email?.toLowerCase().includes(searchLower) ||
          fullName.includes(searchLower) ||
          String(student.cnic || "").includes(search) ||
          String(student.rollNo || "").toLowerCase().includes(searchLower) ||
          String(student.registrationNo || "").toLowerCase().includes(searchLower)
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

    const student = await Student.findOne({ user: user._id }).populate("user", "email roleSlug isActive");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student profile not found" });
    }

    const application = await Application.findOne({ student: student._id })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] });

    const enrollment = await Enrollment.findOne({ studentId: student._id })
      .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] });

    const studentProfile = buildNormalizedStudent(student, user, application, enrollment);

    return res.json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        isActive: user.isActive,
        roleSlug: user.roleSlug,
        student: studentProfile,
      },
      student: studentProfile,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAdminStudentList = async (req, res) => {
  return getAllStudentUsers(req, res);
};

export const getAdminStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate("user", "email roleSlug isActive");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const user = student.user;
    const application = await Application.findOne({ student: student._id })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] });

    const enrollment = await Enrollment.findOne({ studentId: student._id })
      .populate({ path: "batchId", populate: [{ path: "departmentId", select: "name" }, { path: "degreeClassId", select: "name" }, { path: "shiftId", select: "name" }, { path: "startSessionId", select: "year" }] });

    const studentProfile = buildNormalizedStudent(student, user, application, enrollment);

    return res.json({
      success: true,
      student: studentProfile,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const studentIdsFromUsers = (userIds) => userIds.map((id) => id.toString());
