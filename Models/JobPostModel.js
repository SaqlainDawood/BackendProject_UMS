// Models/JobPostModel.js
import mongoose from "mongoose";

const jobPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    roleSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
      // e.g. "teacher", "clerk", "coordinator"
    },
    department: {
      type: String,
      trim: true, 
      default: "",
      // e.g. "Computer Science"
    },
    designation: {
      type: String,
      trim: true,
      default: "",
      // e.g. "Lecturer", "Assistant Professor"
    },

    vacancies: {
      type: Number,
      default: 1,
      min: 1,
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Visiting"],
      default: "Full-time",
    },
    experienceRequired: {
      type: Number,
      default: 0,
      // years
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },

    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      negotiable: { type: Boolean, default: false },
    },

    city: { type: String, trim: true, default: "" },
    campus: { type: String, trim: true, default: "" },

    postedDate: {
      type: Date,
      default: Date.now,
    },
    deadline: {
      type: Date,
      default: null,
    },
    joiningDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["draft", "open", "closed", "filled"],
      default: "open",
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    applicationCount: {
      type: Number,
      default: 0,
    },
    hiredCount: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ✅ Safe guard
const JobPost = mongoose.models.JobPost || mongoose.model("JobPost", jobPostSchema);
export default JobPost;