import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    campusId: { type: mongoose.Schema.Types.ObjectId, ref: "Campus", required: true },
  },
  { timestamps: true }
);

departmentSchema.index({ campusId: 1 });

const Department = mongoose.models.Department || mongoose.model("Department", departmentSchema);
export default Department;