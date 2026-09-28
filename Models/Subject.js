import mongoose from "mongoose";
const subjectSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    creditHours: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
prerequisites: [
      {
        subjectId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        isMandatory: { type: Boolean, default: true },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
subjectSchema.index({ departmentId: 1, code: 1 }, { unique: true });
subjectSchema.pre("save", function (next) {
  if (this.prerequisites?.some((p) => String(p.subjectId) === String(this._id))) {
    return next(new Error("A subject cannot be its own prerequisite"));
  }
  next();
});

const Subject = mongoose.models.Subject || mongoose.model("Subject", subjectSchema);
export default Subject;