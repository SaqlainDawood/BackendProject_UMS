// Models/StaffModel.js
import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    // ========== LOGIN CREDENTIALS ==========
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: true,
      minlength: [6, "Password must be at least 6 characters"],
    },

    // ========== EMAIL VERIFICATION ==========
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpire: { type: Date, default: null },

    // ========== PASSWORD RESET ==========
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },

    // ========== LINK TO USER (after approval) ==========
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ========== APPLICATION STATUS ==========
    applicationStatus: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
      index: true,
    },

    // ========== PROGRESS TRACKING ==========
    currentStep: { type: Number, default: 1, min: 1, max: 6 },
    completedSteps: { type: [Number], default: [] },
    isSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },

    // ============================================================
    // STEP 1: PERSONAL INFO
    // ============================================================
    step1_personalInfo: {
      fullName: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      cnic: { type: String, trim: true, default: "" },
      dateOfBirth: { type: Date, default: null },
      gender: {
        type: String,
        enum: ["Male", "Female", "Other", null],
        default: null,
      },
      city: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
      profileImage: { type: String, default: "" },
    },

    // ============================================================
    // STEP 2: FAMILY INFO
    // ============================================================
    step2_familyInfo: {
      fatherName: { type: String, trim: true, default: "" },
      fatherOccupation: { type: String, trim: true, default: "" },
      motherName: { type: String, trim: true, default: "" },
      maritalStatus: {
        type: String,
        enum: ["Single", "Married", "Other", null],
        default: null,
      },
      emergencyContactPerson: { type: String, trim: true, default: "" },
      emergencyContactPhone: { type: String, trim: true, default: "" },
      emergencyContactRelation: { type: String, trim: true, default: "" },
    },

    // ============================================================
    // STEP 3: EDUCATION (array)
    // ============================================================
    step3_education: [
      {
        degree: { type: String, trim: true, default: "" },
        institution: { type: String, trim: true, default: "" },
        year: { type: Number, default: null },
        grade: { type: String, trim: true, default: "" },
        certificateUrl: { type: String, default: "" },
      },
    ],

    // ============================================================
    // STEP 4: EXPERIENCE (array)
    // ============================================================
    step4_experience: [
      {
        companyName: { type: String, trim: true, default: "" },
        designation: { type: String, trim: true, default: "" },
        fromDate: { type: Date, default: null },
        toDate: { type: Date, default: null },
        description: { type: String, trim: true, default: "" },
        lastSalary: { type: Number, default: 0 },
      },
    ],

    // ============================================================
    // STEP 5: EXPECTATIONS
    // ============================================================
    step5_expectations: {
      expectedSalary: { type: Number, default: 0 },
      joiningDate: { type: Date, default: null },
      preferredDepartment: { type: String, trim: true, default: "" },
      preferredCity: { type: String, trim: true, default: "" },
      additionalNotes: { type: String, trim: true, default: "" },
    },

    // ============================================================
    // STEP 6: APPLY FOR JOB (Job Post Reference)
    // ============================================================
    step6_applyFor: {
      jobPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JobPost",
        default: null,
      },
      roleSlug: { type: String, lowercase: true, trim: true, default: "" },
      department: { type: String, trim: true, default: "" },
      designation: { type: String, trim: true, default: "" },
    },

    // ============================================================
    // ADMIN REVIEW
    // ============================================================
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    // ========== SYSTEM ==========
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Safe guard
const Staff = mongoose.models.Staff || mongoose.model("Staff", staffSchema);
export default Staff;