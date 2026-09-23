// Controllers/Admin/StudentApplicationAdminController.js
import Application from "../../Models/ApplicationModel.js";
import Student from "../../Models/StudentModel.js";
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import Batch from "../../Models/Batch.js";
import bcrypt from "bcryptjs";
import {
  sendStudentApprovedEmail,
  sendStudentRejectedEmail,
} from "../../utils/studentEmailService.js";

/* ============================================================
   1. LIST APPLICATIONS (with filters + pagination)
   GET /api/admin/student-applications
   Query: ?status=pending&degreeClassId=...&search=ali&page=1&limit=20
   Permission: studentapplication:view
   ============================================================ */
export const getAllApplications = async (req, res) => {
  try {
    const {
      status,
      degreeClassId,
      shiftId,
      campusId,
      departmentId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (degreeClassId) filter.degreeClassId = degreeClassId;
    if (shiftId) filter.shiftId = shiftId;
    if (campusId) filter.campusId = campusId;
    if (departmentId) filter.departmentId = departmentId;

    const skip = (Number(page) - 1) * Number(limit);

    let query = Application.find(filter)
      .populate({
        path: "student",
        select: "email personalInfo.fatherName personalInfo.firstName personalInfo.lastName personalInfo.cnic personalInfo.phoneNo",
      })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name")
      .sort("-createdAt")
      .skip(skip)
      .limit(Number(limit));

    let [applications, total] = await Promise.all([
      query,
      Application.countDocuments(filter),
    ]);

    // Search filter (student name/email)
    if (search) {
      const searchLower = search.toLowerCase();
      applications = applications.filter((app) => {
        const s = app.student;
        if (!s) return false;
        const fullName = `${s.personalInfo?.firstName || ""} ${s.personalInfo?.lastName || ""}`.toLowerCase();
        return (
          s.email?.toLowerCase().includes(searchLower) ||
          fullName.includes(searchLower) ||
          s.personalInfo?.cnic?.includes(search)
        );
      });
    }

    return res.json({
      success: true,
      count: applications.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      page: Number(page),
      applications,
    });
  } catch (err) {
    console.error("getAllApplications error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET GROUPED BY DEGREE CLASS
   GET /api/admin/student-applications/grouped
   Permission: studentapplication:view
   ============================================================ */
export const getApplicationsGrouped = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate("student", "email personalInfo.firstName personalInfo.lastName personalInfo.cnic")
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name")
      .sort("-createdAt");

    // Group by degreeClass
    const grouped = {};
    applications.forEach((app) => {
      const classId = app.degreeClassId?._id?.toString() || "unknown";
      const className = app.degreeClassId?.name || "Unknown";

      if (!grouped[classId]) {
        grouped[classId] = {
          degreeClassId: classId,
          degreeClassName: className,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          applications: [],
        };
      }

      grouped[classId].total += 1;
      if (app.status === "pending") grouped[classId].pending += 1;
      if (app.status === "approved") grouped[classId].approved += 1;
      if (app.status === "rejected") grouped[classId].rejected += 1;
      grouped[classId].applications.push(app);
    });

    return res.json({
      success: true,
      grouped: Object.values(grouped),
    });
  } catch (err) {
    console.error("getApplicationsGrouped error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. GET SINGLE APPLICATION
   GET /api/admin/student-applications/:id
   Permission: studentapplication:view
   ============================================================ */
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("student", "-password -emailVerificationToken -resetPasswordToken")
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester")
      .populate("reviewedBy", "email");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.json({ success: true, application });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. APPROVE APPLICATION → UserModel Create + Role Assign + Batch
   PATCH /api/admin/student-applications/:id/approve
   Body: { rollNo?, registrationNo?, section? }
   Permission: studentapplication:approve
   ============================================================ */
export const approveApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("student")
      .populate("degreeClassId")
      .populate("shiftId");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Application already approved",
      });
    }

    const student = application.student;
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    // ✅ Role check
    const role = await Role.findOne({ slug: "student", isActive: true });
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Student role not configured. Please create it first.",
      });
    }

    // ✅ UserModel create/update (same password as student)
    let user = await User.findOne({ email: student.email });

    if (user) {
      // Update existing
      user.role = role._id;
      user.roleSlug = role.slug;
      user.isActive = true;
      user.isDeleted = false;
      // ✅ Password same rahega
      if (!user.password && student.password) {
        user.password = student.password;
      }
      await user.save();
    } else {
      // ✅ Create new user with same password
      user = await User.create({
        email: student.email,
        password: student.password, // ← Same password (already hashed)
        role: role._id,
        roleSlug: role.slug,
        isActive: true,
        isDeleted: false,
      });
    }

    // ✅ Link student → user
    student.user = user._id;
    await student.save();

    // ✅ Auto Batch assign (find matching batch)
    const { rollNo, registrationNo, section } = req.body;

    let assignedBatch = await Batch.findOne({
      campusId: application.campusId,
      departmentId: application.departmentId,
      degreeClassId: application.degreeClassId,
      shiftId: application.shiftId,
      isActive: true,
    }).sort({ createdAt: -1 });

    if (!assignedBatch) {
      // Fallback: match by campus + department + degreeClass
      assignedBatch = await Batch.findOne({
        campusId: application.campusId,
        departmentId: application.departmentId,
        degreeClassId: application.degreeClassId,
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (!assignedBatch) {
      return res.status(400).json({
        success: false,
        message:
          "No matching batch found. Please create a batch first for this campus/department/class/shift.",
      });
    }

    // Auto-generate roll number if not provided
    let finalRollNo = rollNo;
    if (!finalRollNo) {
      const count = await Application.countDocuments({
        batchId: assignedBatch._id,
        status: "approved",
      });
      finalRollNo = `${assignedBatch.name || "BATCH"}-${String(count + 1).padStart(3, "0")}`;
    }

    // Update application
    application.status = "approved";
    application.batchId = assignedBatch._id;
    application.batchAssignedAt = new Date();
    application.rollNo = finalRollNo;
    application.registrationNo = registrationNo || application.registrationNo || null;
    application.section = section || application.section || "";
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.rejectionReason = null;
    await application.save();

    // Increment batch counter
    await Batch.findByIdAndUpdate(assignedBatch._id, {
      $inc: { studentsCount: 1 },
    });

    // Send email
    sendStudentApprovedEmail({
      to: student.email,
      name: `${student.personalInfo?.firstName || ""} ${student.personalInfo?.lastName || ""}`.trim() || "Student",
      rollNo: finalRollNo,
      registrationNo: application.registrationNo,
      program: application.program,
      department: application.enrollmentSnapshot?.department,
    }).catch((err) => console.error("Approval email failed:", err.message));

    return res.json({
      success: true,
      message: "Application approved successfully",
      application: {
        _id: application._id,
        status: application.status,
        rollNo: application.rollNo,
        registrationNo: application.registrationNo,
        section: application.section,
        batchId: application.batchId,
        batchName: assignedBatch.name,
      },
      user: {
        _id: user._id,
        email: user.email,
        roleSlug: user.roleSlug,
      },
    });
  } catch (err) {
    console.error("approveApplication error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. REJECT APPLICATION
   PATCH /api/admin/student-applications/:id/reject
   Body: { reason }
   Permission: studentapplication:reject
   ============================================================ */
export const rejectApplication = async (req, res) => {
  try {
    const { reason } = req.body;
    const application = await Application.findById(req.params.id).populate("student");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    if (application.status === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Application already rejected",
      });
    }

    application.status = "rejected";
    application.rejectionReason = reason || "No reason provided";
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    await application.save();

    // Send email
    const student = application.student;
    sendStudentRejectedEmail({
      to: student.email,
      name: `${student.personalInfo?.firstName || ""} ${student.personalInfo?.lastName || ""}`.trim() || "Student",
      reason,
    }).catch((err) => console.error("Rejection email failed:", err.message));

    return res.json({
      success: true,
      message: "Application rejected",
      application: {
        _id: application._id,
        status: application.status,
        rejectionReason: application.rejectionReason,
      },
    });
  } catch (err) {
    console.error("rejectApplication error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   6. STATS
   GET /api/admin/student-applications/stats
   Permission: studentapplication:view
   ============================================================ */
export const getApplicationStats = async (req, res) => {
  try {
    const [total, pending, approved, rejected, draft] = await Promise.all([
      Application.countDocuments({}),
      Application.countDocuments({ status: "pending" }),
      Application.countDocuments({ status: "approved" }),
      Application.countDocuments({ status: "rejected" }),
      Application.countDocuments({ status: "draft" }),
    ]);

    return res.json({
      success: true,
      stats: { total, pending, approved, rejected, draft },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};