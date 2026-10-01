/**
 * TimeSlot.js
 *
 * Admin-configurable fixed time slots.
 * Timetable entry mein periodNo store hoga, startTime/endTime yahan se aayega.
 * Conflict check (day, periodNo) par hoga — time overlap ka masla nahi rahega.
 *
 * Example slots:
 *   periodNo: 1, label: "Period 1", startTime: "08:00", endTime: "08:50"
 *   periodNo: 2, label: "Period 2", startTime: "09:00", endTime: "09:50"
 *   ...
 */
import mongoose from "mongoose";

const timeSlotSchema = new mongoose.Schema(
  {
    periodNo: {
      type: Number,
      required: true,
      min: 1,
    },
    label: {
      type: String,
      trim: true,
      default: "", // e.g. "Period 1" or "1st Period"
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
      // HH:MM format, e.g. "08:00"
      match: [/^\d{2}:\d{2}$/, "startTime format HH:MM hona chahiye"],
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{2}:\d{2}$/, "endTime format HH:MM hona chahiye"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Har period number unique hona chahiye
timeSlotSchema.index({ periodNo: 1 }, { unique: true });

const TimeSlot =
  mongoose.models.TimeSlot || mongoose.model("TimeSlot", timeSlotSchema);
export default TimeSlot;
