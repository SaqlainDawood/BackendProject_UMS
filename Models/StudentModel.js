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
    semester: { type: String, required: true },
    session: { type: String, required: true },
    department: { type: String, required: true },
    shift: { type: String, required: true },
    campus: { type: String, required: true },
    appliedOn: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StudentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Step 1: Personal Info
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  cnic: {
    type: String,
    required: true,
    unique: true,
    minlength: [13, "cnic must exactly 13 digits"],
    maxlength: [13, "cnic must exactly 13 digits"],
    match: [/^\d{13}$/, "CNIC must contain only digits"],
  },
  DOB: { type: Date },
  province: { type: String },
  domicile: { type: String },
  phoneNo: { type: String, required: true },
  presentAddress: { type: String, required: true },
  permanentAddress: { type: String, required: true },
  religion: { type: String, required: true },
  gender: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  maritalStatus: { type: String, required: true },
  nationality: { type: String, required: true },
  status: {
    type: String,
    enum: ["draft", "pending", "approved", "unassigned", "assign", "rejected", "active", "suspend"],
    default: "draft", // Changed from "pending" to "draft"
  },
  rejectionReason: { type: String, default: null },
  rollNo: { type: String, default: null },
  section: { type: String, default: "" },
  registrationNo: { type: String, default: null },
  
  // profile image
  profileImage: {
    url: { type: String },
    public_id: { type: String },
  },

  // Step 2: Family
  family: FamilySchema,

  // Step 3: Academic (educationList = array of objects)
  academic: {
    educationList: [EducationSchema],
  },

  // Step 4: Enrollment
  enrollment: EnrollmentSchema,
  
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
  
  // Draft management fields
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
  temporaryFiles: [{
    url: { type: String },
    public_id: { type: String },
    type: { type: String }, // 'profile' or 'marksheet'
  }],
  
  createdAt: { type: Date, default: Date.now },
});

// Add TTL index for auto-deleting old drafts
StudentSchema.index({ draftExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Student", StudentSchema);