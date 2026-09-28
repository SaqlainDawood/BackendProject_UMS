import mongoose from "mongoose";
const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    designation: {
      type: String,
      trim: true,
      default: "Lecturer",
    },
    specialization: {
      type: [String],
      default: [],
    },
    joiningDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
teacherSchema.index({ departmentId: 1, isActive: 1 });
const Teacher = mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);
export default Teacher;