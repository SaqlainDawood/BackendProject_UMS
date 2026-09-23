// Controllers/Staff/StaffAdminController.js
import Staff from "../../Models/StaffModel.js";
import User from "../../Models/UserModel.js";
import Role from "../../Models/RoleModel.js";
import JobPost from "../../Models/JobPostModel.js";
import JobApplication from "../../Models/JobApplicationModel.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  sendStaffApprovedEmail,
  sendStaffRejectedEmail,
} from "../../utils/staffEmailService.js";

/* ============================================================
   1. LIST APPLICATIONS
   GET /api/staff/admin?status=pending&page=1
   Permission: staff:view
   ============================================================ */
export const getAllStaffApplications = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.applicationStatus = status;

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: "i" } },
        { "step1_personalInfo.fullName": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [staff, total] = await Promise.all([
      Staff.find(filter)
        .select("-password -emailVerificationToken -resetPasswordToken")
        .populate(
          "step6_applyFor.jobPost",
          "title roleSlug department designation status"
        )
        .sort("-createdAt")
        .skip(skip)
        .limit(Number(limit)),
      Staff.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: staff.length,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      page: Number(page),
      staff,
    });
  } catch (err) {
    console.error("getAllStaffApplications error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   2. GET SINGLE APPLICATION
   GET /api/staff/admin/:id
   ============================================================ */
export const getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .populate("reviewedBy", "email")
      .populate(
        "step6_applyFor.jobPost",
        "title roleSlug department designation status salaryRange deadline"
      );

    if (!staff || staff.isDeleted) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    return res.json({ success: true, staff });
  } catch (err) {
    console.error("getStaffById error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   3. APPROVE APPLICATION
   PATCH /api/staff/admin/:id/approve
   Body: { roleSlug?, customPassword? }
   Permission: staff:approve
   ============================================================ */
export const approveStaffApplication = async (req, res) => {
  try {
    // 1. Find staff
    const staff = await Staff.findById(req.params.id);
    if (!staff || staff.isDeleted) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    if (staff.applicationStatus === "approved") {
      return res.status(400).json({
        success: false,
        message: "Application already approved",
      });
    }

    // 2. Email must exist
    if (!staff.email) {
      return res.status(400).json({
        success: false,
        message: "Staff has no email address",
      });
    }

    // 3. Determine role
    const { roleSlug, customPassword } = req.body;
    const finalRoleSlug = roleSlug || staff.step6_applyFor?.roleSlug;

    if (!finalRoleSlug) {
      return res.status(400).json({
        success: false,
        message: "roleSlug is required (either in body or in step 6)",
      });
    }

    const role = await Role.findOne({
      slug: finalRoleSlug.toLowerCase(),
      isActive: true,
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: `Role "${finalRoleSlug}" not found or inactive`,
      });
    }

    // 4. Validate job post (if any)
    let jobPost = null;
    if (staff.step6_applyFor?.jobPost) {
      jobPost = await JobPost.findById(staff.step6_applyFor.jobPost);
      if (!jobPost || jobPost.isDeleted) {
        return res.status(400).json({
          success: false,
          message: "Selected job post no longer exists. Cannot approve.",
        });
      }
    }

    // 5. Generate password
    const tempPassword =
      customPassword || crypto.randomBytes(4).toString("hex") + "@123";
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 6. Create or update User
    let user = await User.findOne({ email: staff.email });

    if (user) {
      user.role = role._id;
      user.roleSlug = role.slug;
      user.password = hashedPassword;
      user.isActive = true;
      user.isDeleted = false;
      await user.save();
    } else {
      user = await User.create({
        email: staff.email,
        password: hashedPassword,
        role: role._id,
        roleSlug: role.slug,
        isActive: true,
        isDeleted: false,
      });
    }

    // 7. Update staff
    staff.user = user._id;
    staff.applicationStatus = "approved";
    staff.reviewedBy = req.user.id;
    staff.reviewedAt = new Date();
    staff.rejectionReason = null; // clear if previously rejected
    await staff.save();

    // 8. Update job post counters
    if (jobPost) {
      await JobPost.findByIdAndUpdate(jobPost._id, {
        $inc: { hiredCount: 1 },
      });
    }

    // 9. Update JobApplication status
    if (jobPost) {
      await JobApplication.findOneAndUpdate(
        {
          jobPost: jobPost._id,
          applicant: staff._id,
        },
        {
          status: "hired",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        }
      );
    }

    // 10. Send approval email (non-blocking)
    sendStaffApprovedEmail({
      to: staff.email,
      name: staff.step1_personalInfo?.fullName || "Applicant",
      role: role.name,
      tempPassword,
      department:
        staff.step6_applyFor?.department || jobPost?.department || "",
      designation:
        staff.step6_applyFor?.designation || jobPost?.designation || "",
      joiningDate: staff.step5_expectations?.joiningDate
        ? new Date(staff.step5_expectations.joiningDate).toDateString()
        : null,
    }).catch((err) => console.error("Approval email failed:", err.message));

    // 11. Response
    return res.json({
      success: true,
      message: "Application approved and user account created",
      user: {
        _id: user._id,
        email: user.email,
        role: role.name,
        roleSlug: role.slug,
      },
      staff: {
        _id: staff._id,
        applicationStatus: staff.applicationStatus,
        reviewedAt: staff.reviewedAt,
      },
      // ⚠️ dev only
      ...(process.env.NODE_ENV !== "production" && { tempPassword }),
    });
  } catch (err) {
    console.error("approveStaffApplication error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   4. REJECT APPLICATION
   PATCH /api/staff/admin/:id/reject
   Body: { reason? }
   Permission: staff:approve
   ============================================================ */
export const rejectStaffApplication = async (req, res) => {
  try {
    const { reason } = req.body;
    const staff = await Staff.findById(req.params.id);

    if (!staff || staff.isDeleted) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    if (staff.applicationStatus === "rejected") {
      return res.status(400).json({
        success: false,
        message: "Application already rejected",
      });
    }

    // Update staff
    staff.applicationStatus = "rejected";
    staff.rejectionReason = reason || "No reason provided";
    staff.reviewedBy = req.user.id;
    staff.reviewedAt = new Date();
    await staff.save();

    // Update JobApplication status (if exists)
    if (staff.step6_applyFor?.jobPost) {
      await JobApplication.findOneAndUpdate(
        {
          jobPost: staff.step6_applyFor.jobPost,
          applicant: staff._id,
        },
        {
          status: "rejected",
          reviewNotes: reason || "No reason provided",
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
        }
      );
    }

    // Send rejection email (non-blocking)
    sendStaffRejectedEmail({
      to: staff.email,
      name: staff.step1_personalInfo?.fullName || "Applicant",
      reason: reason || "No reason provided",
      role:
        staff.step6_applyFor?.designation ||
        staff.step6_applyFor?.roleSlug ||
        "the position",
    }).catch((err) => console.error("Rejection email failed:", err.message));

    return res.json({
      success: true,
      message: "Application rejected",
      staff: {
        _id: staff._id,
        applicationStatus: staff.applicationStatus,
        rejectionReason: staff.rejectionReason,
        reviewedAt: staff.reviewedAt,
      },
    });
  } catch (err) {
    console.error("rejectStaffApplication error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   5. STATS
   GET /api/staff/admin/stats
   ============================================================ */
export const getStaffStats = async (req, res) => {
  try {
    const [total, draft, pending, approved, rejected] = await Promise.all([
      Staff.countDocuments({ isDeleted: false }),
      Staff.countDocuments({ isDeleted: false, applicationStatus: "draft" }),
      Staff.countDocuments({ isDeleted: false, applicationStatus: "pending" }),
      Staff.countDocuments({ isDeleted: false, applicationStatus: "approved" }),
      Staff.countDocuments({ isDeleted: false, applicationStatus: "rejected" }),
    ]);

    return res.json({
      success: true,
      stats: { total, draft, pending, approved, rejected },
    });
  } catch (err) {
    console.error("getStaffStats error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ============================================================
   6. DELETE APPLICATION (soft)
   DELETE /api/staff/admin/:id
   ============================================================ */
export const deleteStaffApplication = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    );

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found" });
    }

    return res.json({ success: true, message: "Application deleted" });
  } catch (err) {
    console.error("deleteStaffApplication error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};