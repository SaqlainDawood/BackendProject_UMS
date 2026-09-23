
import mongoose from "mongoose";
const ApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    program: { type: String, default: "" }, 
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

    // Denormalized snapshot (quick display)
    enrollmentSnapshot: {
      campus: { type: String, default: "" },
      department: { type: String, default: "" },
      degreeClass: { type: String, default: "" },
      shift: { type: String, default: "" },
      program: { type: String, default: "" },
    },

    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "draft",
      index: true,
    },

    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      default: null,
    },
    batchAssignedAt: { type: Date, default: null },
    rollNo: { type: String, default: null },
    registrationNo: { type: String, default: null },
    section: { type: String, default: "" },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },
    submittedAt: { type: Date, default: null },

    gpa: {
      type: [
        {
          semester: { type: String },
          value: { type: Number },
        },
      ],
      default: [],
    },
    cgpa: { type: Number, default: null },
  },
  { timestamps: true }
);
ApplicationSchema.index(
  { student: 1, degreeClassId: 1, shiftId: 1 },
  { unique: true, sparse: true }
);

ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ batchId: 1 });
const Application =
  mongoose.models.Application ||
  mongoose.model("Application", ApplicationSchema);

export default Application;