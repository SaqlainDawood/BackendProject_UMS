/**
 * Room.js
 *
 * Physical rooms/labs.
 * Timetable entry mein roomId (ref) store hoga, string nahi.
 * Room conflict check: (roomId, sessionId, day, periodNo) unique hona chahiye.
 */
import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      // e.g. "CS Lab 1", "Room 101", "Seminar Hall"
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      // e.g. "CSL1", "R101"
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ["classroom", "lab", "seminar_hall", "auditorium"],
      default: "classroom",
    },
    campusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campus",
      default: null,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Room code campus ke andar unique hona chahiye
roomSchema.index({ code: 1 }, { unique: true });

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);
export default Room;
