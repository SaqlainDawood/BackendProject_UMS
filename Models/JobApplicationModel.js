// Models/JobApplicationModel.js
import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPost",
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    applicantName: { type: String, trim: true, default: "" },
    applicantEmail: { type: String, trim: true, lowercase: true, default: "" },
    applicantPhone: { type: String, trim: true, default: "" },

    status: {
      type: String,
      enum: ["pending", "shortlisted", "interviewed", "hired", "rejected"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    reviewNotes: { type: String, trim: true, default: "" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent same staff applying twice to same job post
jobApplicationSchema.index({ jobPost: 1, applicant: 1 }, { unique: true });

// Safe guard
const JobApplication =
  mongoose.models.JobApplication ||
  mongoose.model("JobApplication", jobApplicationSchema);

export default JobApplication;