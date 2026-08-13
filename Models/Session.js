import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // "Fall 2026"
    term: { type: String, enum: ["Fall", "Spring", "Summer"], required: true },
    year: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Session = mongoose.models.Session || mongoose.model("Session", sessionSchema);
export default Session;