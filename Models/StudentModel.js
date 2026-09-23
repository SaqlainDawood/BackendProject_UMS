
import mongoose from "mongoose";
const PersonalInfoSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    cnic: {
      type: String,
      unique: true,
      sparse: true,
      minlength: [13, "CNIC must be 13 digits"],
      maxlength: [13, "CNIC must be 13 digits"],
      match: [/^\d{13}$/, "CNIC must contain only digits"],
    },
    DOB: { type: Date, default: null },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other", ""],
      default: "",
    },
    religion: { type: String, default: "" },
    nationality: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Other", ""],
      default: "",
    },
    phoneNo: { type: String, default: "" },
    profileImage: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

/* Step 2: Family Info */
const FamilyInfoSchema = new mongoose.Schema(
  {
    fatherName: { type: String, default: "" },
    fatherCnic: { type: String, default: "" },
    fatherOccupation: { type: String, default: "" },
    fatherMobile: { type: String, default: "" },
    motherName: { type: String, default: "" },
    motherCnic: { type: String, default: "" },
    motherOccupation: { type: String, default: "" },
    motherMobile: { type: String, default: "" },
    guardianName: { type: String, default: "" },
    guardianRelation: { type: String, default: "" },
    guardianMobile: { type: String, default: "" },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

/* Step 3: Education (array) */
const EducationSchema = new mongoose.Schema(
  {
    degreeLevel: { type: String, default: "" }, // Matric, Inter, BS, etc.
    qualification: { type: String, default: "" },
    institution: { type: String, default: "" },
    boardUni: { type: String, default: "" },
    passingYear: { type: String, default: "" },
    rollNo: { type: String, default: "" },
    totalMarks: { type: Number, default: 0 },
    obtainMarks: { type: Number, default: 0 },
    percentage: { type: String, default: "" },
    markSheet: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
  },
  { _id: false }
);

/* Address Info */
const AddressInfoSchema = new mongoose.Schema(
  {
    presentAddress: { type: String, default: "" },
    permanentAddress: { type: String, default: "" },
    province: { type: String, default: "" },
    city: { type: String, default: "" },
    domicile: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

/* Disability Info */
const DisabilityInfoSchema = new mongoose.Schema(
  {
    hasDisability: { type: Boolean, default: false },
    disabilityType: { type: String, default: "" },
    disabilityDescription: { type: String, default: "" },
    disabilityCertificate: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

const OtherInfoSchema = new mongoose.Schema(
  {
    extraCurricular: { type: String, default: "" },
    achievements: { type: String, default: "" },
    hobbies: { type: String, default: "" },
    additionalNotes: { type: String, default: "" },
    isComplete: { type: Boolean, default: false },
  },
  { _id: false }
);

const StudentSchema = new mongoose.Schema(
  {
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

    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpire: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpire: { type: Date, default: null },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    personalInfo: { type: PersonalInfoSchema, default: () => ({}) },
    familyInfo: { type: FamilyInfoSchema, default: () => ({}) },
    education: { type: [EducationSchema], default: [] },
    addressInfo: { type: AddressInfoSchema, default: () => ({}) },
    disabilityInfo: { type: DisabilityInfoSchema, default: () => ({}) },
    otherInfo: { type: OtherInfoSchema, default: () => ({}) },
    lastStepCompleted: { type: Number, default: 0 },
    completedSteps: { type: [Number], default: [] },
    isProfileComplete: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

StudentSchema.index({ email: 1 });
StudentSchema.index({ user: 1 });

const Student =
  mongoose.models.Student || mongoose.model("Student", StudentSchema);

export default Student;