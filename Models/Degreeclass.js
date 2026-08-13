import mongoose from "mongoose";
const degreeClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },  
    code: { type: String, required: true, uppercase: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    duration: { type: Number }, 
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
degreeClassSchema.index({ departmentId: 1, code: 1 }, { unique: true });
const DegreeClass = mongoose.models.DegreeClass || mongoose.model("DegreeClass", degreeClassSchema);
export default DegreeClass;