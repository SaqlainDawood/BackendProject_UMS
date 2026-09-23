// Controllers/Staff/StaffStepController.js
import Staff from "../../Models/StaffModel.js";
import JobPost from "../../Models/JobPostModel.js";
import JobApplication from "../../Models/JobApplicationModel.js";
import { sendStaffApplicationSubmittedEmail } from "../../utils/staffEmailService.js";

/* ============================================================
   STEP FIELD MAPPING
   ============================================================ */
const STEP_FIELDS = {
  1: "step1_personalInfo",
  2: "step2_familyInfo",
  3: "step3_education",
  4: "step4_experience",
  5: "step5_expectations",
  6: "step6_applyFor",
};

/* ============================================================
   SAVE STEP
   POST /api/staff/step/:step
   Protected (protectStaff)
   ============================================================ */
export const saveStaffStep = async (req, res) => {
  try {
    const step = Number(req.params.step);
    const staffId = req.staff.id;

    // Validate step number
    if (![1, 2, 3, 4, 5, 6].includes(step)) {
      return res.status(400).json({
        success: false,
        message: "Invalid step. Allowed: 1-6",
      });
    }

    const staff = await Staff.findById(staffId);
    if (!staff || staff.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (staff.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Application already submitted. Cannot edit.",
      });
    }

    const field = STEP_FIELDS[step];

    /* ============================================================
       ✅ STEP 6 SPECIAL — Job Post Select (jobPostId)
       ============================================================ */
    if (step === 6) {
      const { jobPostId, roleSlug, department, designation } = req.body;

      // 1. jobPostId required
      if (!jobPostId) {
        return res.status(400).json({
          success: false,
          message: "jobPostId is required in step 6",
        });
      }

      // 2. Job post exist check
      const jobPost = await JobPost.findOne({
        _id: jobPostId,
        isDeleted: false,
      });

      if (!jobPost) {
        return res.status(404).json({
          success: false,
          message: "Job post not found",
        });
      }

      // 3. Status check
      if (jobPost.status !== "open") {
        return res.status(400).json({
          success: false,
          message: `This job post is not open for applications (status: ${jobPost.status})`,
        });
      }

      // 4. Deadline check
      if (jobPost.deadline && new Date(jobPost.deadline) < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Application deadline has passed for this job",
        });
      }

      // 5. Save to staff
      staff.step6_applyFor = {
        jobPost: jobPost._id,
        roleSlug: (roleSlug || jobPost.roleSlug || "").toLowerCase(),
        department: department || jobPost.department || "",
        designation: designation || jobPost.designation || "",
      };
    } else if (step === 3 || step === 4) {
      // Array fields (education, experience) — replace entirely
      staff[field] = req.body[field] ?? req.body.data ?? req.body;
    } else {
      // Object fields (1, 2, 5) — merge
      const incoming = req.body[field] ?? req.body;
      staff[field] = {
        ...(staff[field]?.toObject?.() ?? staff[field] ?? {}),
        ...incoming,
      };
    }

    // Progress tracking
    if (!staff.completedSteps.includes(step)) {
      staff.completedSteps.push(step);
    }

    // Advance currentStep if applicable
    if (step === staff.currentStep && step < 6) {
      staff.currentStep = step + 1;
    }

    await staff.save();

    return res.json({
      success: true,
      message: `Step ${step} saved successfully`,
      staff: {
        _id: staff._id,
        currentStep: staff.currentStep,
        completedSteps: staff.completedSteps,
        isSubmitted: staff.isSubmitted,
        applicationStatus: staff.applicationStatus,
        [field]: staff[field],
      },
    });
  } catch (err) {
    console.error("saveStaffStep error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   GET STEP DATA
   GET /api/staff/step/:step
   ============================================================ */
export const getStaffStep = async (req, res) => {
  try {
    const step = Number(req.params.step);

    if (![1, 2, 3, 4, 5, 6].includes(step)) {
      return res.status(400).json({
        success: false,
        message: "Invalid step",
      });
    }

    const staff = await Staff.findById(req.staff.id)
      .select("-password")
      .populate(
        "step6_applyFor.jobPost",
        "title roleSlug department designation status salaryRange deadline"
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    const field = STEP_FIELDS[step];

    return res.json({
      success: true,
      step,
      data: staff[field] || (step === 3 || step === 4 ? [] : {}),
    });
  } catch (err) {
    console.error("getStaffStep error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   GET FULL APPLICATION
   GET /api/staff/application
   ============================================================ */
export const getStaffApplication = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff.id)
      .select("-password")
      .populate(
        "step6_applyFor.jobPost",
        "title roleSlug department designation status salaryRange"
      );

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    return res.json({
      success: true,
      staff,
    });
  } catch (err) {
    console.error("getStaffApplication error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/* ============================================================
   SUBMIT APPLICATION
   POST /api/staff/submit
   ============================================================ */
export const submitStaffApplication = async (req, res) => {
  try {
    const staff = await Staff.findById(req.staff.id);
    if (!staff || staff.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    if (staff.isSubmitted) {
      return res.status(400).json({
        success: false,
        message: "Application already submitted",
      });
    }

    // Check all steps completed
    const requiredSteps = [1, 2, 3, 4, 5, 6];
    const missing = requiredSteps.filter(
      (s) => !staff.completedSteps.includes(s)
    );

    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Please complete all steps first. Missing: ${missing.join(", ")}`,
      });
    }

    // Job post must be selected
    if (!staff.step6_applyFor?.jobPost) {
      return res.status(400).json({
        success: false,
        message: "Step 6 must include a selected job post",
      });
    }

    // Re-validate job post (it may have been closed since step 6)
    const jobPost = await JobPost.findOne({
      _id: staff.step6_applyFor.jobPost,
      isDeleted: false,
    });

    if (!jobPost) {
      return res.status(404).json({
        success: false,
        message: "Selected job post no longer exists",
      });
    }

    if (jobPost.status !== "open") {
      return res.status(400).json({
        success: false,
        message: `Selected job post is no longer open (status: ${jobPost.status})`,
      });
    }

    if (jobPost.deadline && new Date(jobPost.deadline) < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Application deadline has passed",
      });
    }

    // Duplicate check (same staff + same job)
    const existing = await JobApplication.findOne({
      jobPost: staff.step6_applyFor.jobPost,
      applicant: staff._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Create JobApplication
    const application = await JobApplication.create({
      jobPost: staff.step6_applyFor.jobPost,
      applicant: staff._id,
      applicantName: staff.step1_personalInfo?.fullName || "Applicant",
      applicantEmail: staff.email,
      applicantPhone: staff.step1_personalInfo?.phone || "",
      status: "pending",
    });

    // Update staff
    staff.isSubmitted = true;
    staff.submittedAt = new Date();
    staff.applicationStatus = "pending";
    await staff.save();

    // Increment job post counter
    await JobPost.findByIdAndUpdate(staff.step6_applyFor.jobPost, {
      $inc: { applicationCount: 1 },
    });

    // Send confirmation email (non-blocking)
    sendStaffApplicationSubmittedEmail({
      to: staff.email,
      name: staff.step1_personalInfo?.fullName || "Applicant",
    }).catch((err) =>
      console.error("Submit confirmation email failed:", err.message)
    );

    return res.json({
      success: true,
      message: "Application submitted successfully",
      application: {
        _id: application._id,
        jobPost: application.jobPost,
        status: application.status,
        submittedAt: application.createdAt,
      },
      staff: {
        _id: staff._id,
        applicationStatus: staff.applicationStatus,
        submittedAt: staff.submittedAt,
      },
    });
  } catch (err) {
    console.error("submitStaffApplication error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};