import mongoose from "mongoose";

const EducationSchema = new mongoose.Schema(
  {
    degreeLevel: { type: String, required: true },
    qualification: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    obtainMarks: { type: Number, required: true },
    percentage: { type: String, required: true },
    passingYear: { type: String, required: true },
    rollNo: { type: String, required: true },
    boardUni: { type: String, required: true },
    markSheet: {
      url: { type: String },
      public_id: { type: String },
    },
  },
  { _id: false }
);

const FamilySchema = new mongoose.Schema(
  {
    fatherName: { type: String },
    motherName: { type: String },
    fatherCnic: { type: String },
    fatherMobile: { type: String },
  },
  { _id: false }
);

const EnrollmentSchema = new mongoose.Schema(
  {
    program: { type: String, required: true },
    semester: { type: String, default: "" },
    session: { type: String, default: "" },
    department: { type: String, required: true },
    shift: { type: String, required: true },
    campus: { type: String, required: true },
    appliedOn: { type: Date, default: Date.now },
  },
  { _id: false }
);

/* ============================================================
   MAIN STUDENT SCHEMA
   ============================================================ */

const StudentSchema = new mongoose.Schema(
  {
    // ========== LINK TO USER ==========
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpire: {
      type: Date,
      default: null,
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpire: {
      type: Date,
      default: null,
    },

    firstName: { type: String }, // (required hataya — draft mein khaali ho sakta hai)
    lastName: { type: String },
    cnic: {
      type: String,
      unique: true,
      sparse: true, // ✅ sparse — draft mein null ho sakta hai
      minlength: [13, "cnic must exactly 13 digits"],
      maxlength: [13, "cnic must exactly 13 digits"],
      match: [/^\d{13}$/, "CNIC must contain only digits"],
    },
    DOB: { type: Date },
    province: { type: String },
    domicile: { type: String },
    phoneNo: { type: String },
    presentAddress: { type: String },
    permanentAddress: { type: String },
    religion: { type: String },
    gender: { type: String },
    bloodGroup: { type: String },
    maritalStatus: { type: String },
    nationality: { type: String },

    profileImage: {
      url: { type: String },
      public_id: { type: String },
    },

    family: FamilySchema,

    academic: {
      educationList: [EducationSchema],
    },    enrollment: EnrollmentSchema,
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    degreeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DegreeClass",
      default: null,
    },
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "unassigned",
        "assign",
        "rejected",
        "active",
        "suspend",
      ],
      default: "draft",
    },
    rejectionReason: { type: String, default: null },
    rollNo: { type: String, default: null },
    section: { type: String, default: "" },
    registrationNo: { type: String, default: null },

    gpa: {
      type: [
        {
          semester: { type: String },
          value: { type: Number },
        },
      ],
      default: [],
    },
    cgpa: {
      type: Number,
      default: null,
    },
    documents: {
      cnic: { type: Boolean, default: true },
      marksheet: { type: Boolean, default: false },
      photo: { type: Boolean, default: true },
      domicile: { type: Boolean, default: true },
    },
    isComplete: {
      type: Boolean,
      default: false,
    },
    lastStepCompleted: {
      type: Number,
      default: 0,
    },
    draftExpiresAt: {
      type: Date,
      default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    temporaryFiles: [
      {
        url: { type: String },
        public_id: { type: String },
        type: { type: String }, // 'profile' or 'marksheet'
      },
    ],

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


// TTL index for auto-deleting old drafts
StudentSchema.index({ draftExpiresAt: 1 }, { expireAfterSeconds: 0 });

// For faster lookups
StudentSchema.index({ user: 1 });
StudentSchema.index({ status: 1 });

const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

export default Student;