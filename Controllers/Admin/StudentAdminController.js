// Controllers/Admin/StudentAdminController.js
import mongoose from "mongoose";
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import Student from "../../Models/StudentModel.js";
import Application from "../../Models/ApplicationModel.js";
import Enrollment from "../../Models/Enrollment.js";

const SENSITIVE_FIELDS = [
  "password",
  "emailVerificationToken",
  "emailVerificationExpire",
  "resetPasswordToken",
  "resetPasswordExpire",
];

const batchPopulate = {
  path: "batchId",
  populate: [
    { path: "departmentId", select: "name" },
    { path: "degreeClassId", select: "name" },
    { path: "shiftId", select: "name" },
    { path: "startSessionId", select: "year" },
  ],
};

const normalizeStudentStatus = (value) => {
  const normalized = String(value || "").trim().toLowerCase();

  if (["active", "approved", "pending", "rejected", "suspend", "suspended", "inactive", "unassigned", "assign"].includes(normalized)) {
    return normalized === "suspend" || normalized === "suspended" ? "suspend" : normalized;
  }

  if (normalized === "draft") return "pending";
  if (!normalized) return "active";
  return normalized;
};

const toPlain = (doc) => (doc ? (doc.toObject ? doc.toObject() : { ...doc }) : {});

const buildNormalizedStudent = (studentDoc, userDoc, applicationDoc, enrollmentDoc) => {
  const student = toPlain(studentDoc);
  const user = toPlain(userDoc);
  const application = toPlain(applicationDoc);
  const enrollment = toPlain(enrollmentDoc);

  // password / tokens kabhi response mein nahi jane chahiye
  SENSITIVE_FIELDS.forEach((k) => delete student[k]);

  const appBatch = application.batchId || enrollment.batchId || null;
  const batch = appBatch && typeof appBatch === "object" ? appBatch : null;
  const deptName = application.departmentId?.name || batch?.departmentId?.name || "";
  const semesterValue = application.batchId?.currentSemester ?? batch?.currentSemester ?? enrollment.batchId?.currentSemester ?? "";
  const sessionName = batch?.startSessionId?.year || application.batchId?.startSessionId?.year || "";

  const userId = user._id || (student.user && student.user._id) || student.user || null;

  return {
    ...student,
    _id: student._id || user._id,
    userId,
    email: user.email || student.email || "",
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
    city: student.addressInfo?.city || "",
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
    user: user._id
      ? {
          _id: user._id,
          email: user.email,
          roleSlug: user.roleSlug,
          isActive: user.isActive,
        }
      : { email: student.email || "" },
  };
};

/* ------------------------------------------------------------
   Helper: user ka Student profile dhoondo.
   1) user field se, 2) na mile to email se (aur link kar do)
   ------------------------------------------------------------ */
const findStudentForUser = async (user) => {
  let student = await Student.findOne({ user: user._id }).populate("user", "email roleSlug isActive");
  if (student) return student;

  if (user.email) {
    const byEmail = await Student.findOne({ email: String(user.email).toLowerCase().trim() });
    if (byEmail) {
      // kisi aur user se linked hai to touch na karein
      if (byEmail.user && String(byEmail.user) !== String(user._id)) return null;

      if (!byEmail.user) {
        await Student.updateOne({ _id: byEmail._id }, { $set: { user: user._id } });
      }
      return Student.findById(byEmail._id).populate("user", "email roleSlug isActive");
    }
  }
  return null;
};

// id Student _id ho ya User _id, dono chalenge
const loadStudentDetail = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  let student = await Student.findById(id).populate("user", "email roleSlug isActive");
  let user = student?.user || null;

  if (!student) {
    user = await User.findById(id).select("-password -emailVerificationToken -resetPasswordToken");
    if (!user) return null;
    student = await findStudentForUser(user);
    if (student?.user) user = student.user;
  } else if (!user && student.email) {
    // student mila magar user link nahi: email se user dhoondo
    user = await User.findOne({ email: student.email }).select("email roleSlug isActive");
    if (user && !student.user) {
      await Student.updateOne({ _id: student._id }, { $set: { user: user._id } });
    }
  }

  const [application, enrollment] = student
    ? await Promise.all([
        Application.findOne({ student: student._id })
          .populate("campusId", "name")
          .populate("departmentId", "name")
          .populate("degreeClassId", "name")
          .populate("shiftId", "name")
          .populate(batchPopulate),
        Enrollment.findOne({ studentId: student._id }).populate(batchPopulate),
      ])
    : [null, null];

  return {
    user,
    hasProfile: !!student,
    profile: buildNormalizedStudent(student, user, application, enrollment),
  };
};

/* ============================================================
   GET ALL STUDENTS
   GET /api/admin/students
   ============================================================ */
export const getAllStudentUsers = async (req, res) => {
  try {
    const { search, isActive, page = 1, limit = 20 } = req.query;

    const studentRole = await Role.findOne({ slug: "student" });
    if (!studentRole) {
      return res.status(404).json({ success: false, message: "Student role not configured" });
    }

    const userFilter = { role: studentRole._id, isDeleted: false };
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

    // 1) user se linked students
    let students = await Student.find({ user: { $in: userIds } }).populate("user", "email roleSlug isActive");

    // 2) jin users ka profile link nahi, unhein email se dhoondo aur link kar do
    const linkedUserIds = new Set(students.map((s) => String(s.user?._id || s.user)));
    const unlinkedUsers = users.filter((u) => !linkedUserIds.has(String(u._id)));

    if (unlinkedUsers.length) {
      const emails = unlinkedUsers.map((u) => String(u.email).toLowerCase().trim());
      const byEmail = await Student.find({
        email: { $in: emails },
        $or: [{ user: null }, { user: { $exists: false } }],
      });

      if (byEmail.length) {
        const userByEmail = new Map(unlinkedUsers.map((u) => [String(u.email).toLowerCase().trim(), u]));
        const ops = byEmail
          .map((s) => {
            const u = userByEmail.get(s.email);
            return u ? { updateOne: { filter: { _id: s._id }, update: { $set: { user: u._id } } } } : null;
          })
          .filter(Boolean);
        if (ops.length) await Student.bulkWrite(ops);

        const linked = await Student.find({ _id: { $in: byEmail.map((s) => s._id) } }).populate("user", "email roleSlug isActive");
        students = students.concat(linked);
      }
    }

    // Application / Enrollment mein STUDENT ids store hoti hain, user ids nahi
    const studentIds = students.map((s) => s._id);

    const [applications, enrollments] = await Promise.all([
      Application.find({ student: { $in: studentIds } })
        .populate("campusId", "name")
        .populate("departmentId", "name")
        .populate("degreeClassId", "name")
        .populate("shiftId", "name")
        .populate(batchPopulate),
      Enrollment.find({ studentId: { $in: studentIds } }).populate(batchPopulate),
    ]);

    const studentByUserId = new Map(
      students.map((s) => [s.user?._id?.toString() || s.user?.toString(), s])
    );
    const appByStudentId = new Map(applications.map((a) => [a.student?.toString(), a]));
    const enrollmentByStudentId = new Map(enrollments.map((e) => [e.studentId?.toString(), e]));

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
        profileMissing: !profile,
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
   GET SINGLE STUDENT BY USER ID (ya Student ID)
   GET /api/admin/students/:userId
   ============================================================ */
export const getStudentUserById = async (req, res) => {
  try {
    const detail = await loadStudentDetail(req.params.userId);
    if (!detail) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        userId: detail.user?._id,
        email: detail.user?.email || detail.profile.email,
        isActive: detail.user?.isActive,
        roleSlug: detail.user?.roleSlug,
        student: detail.profile,
      },
      student: detail.profile,
      profileMissing: !detail.hasProfile,
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
    const detail = await loadStudentDetail(req.params.id);
    if (!detail) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    return res.json({
      success: true,
      student: detail.profile,
      profileMissing: !detail.hasProfile,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};