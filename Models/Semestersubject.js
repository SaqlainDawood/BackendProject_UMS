import mongoose from "mongoose";

const semesterSubjectSchema = new mongoose.Schema(
  {
    programSemesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramSemester",
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    creditHours: {
      type: Number,
      required: true,
      min: 1,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
        default: [],
      },
    ],

    // COMPULSORY ya ELECTIVE
    subjectType: {
      type: String,
      enum: ["COMPULSORY", "ELECTIVE"],
      default: "COMPULSORY",
    },

    // --- NEW: Delivery type ---
    // theory        → sirf lectures
    // practical     → sirf lab
    // theory+practical → dono
    deliveryType: {
      type: String,
      enum: ["theory", "practical", "theory+practical"],
      default: "theory",
    },

    // --- NEW: Theory aur Practical credit breakdown ---
    // Null matlab: poora creditHours theory hai (ya jo computeWeeklyLectures decide kare)
    theoryHours: {
      type: Number,
      default: null,
      min: 0,
    },
    practicalHours: {
      type: Number,
      default: null,
      min: 0,
    },

    // --- NEW: Optional manual override for weekly lectures ---
    // Null raha to computeWeeklyLectures(ss) se auto-calculate hoga
    weeklyLectures: {
      type: Number,
      default: null,
      min: 1,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

semesterSubjectSchema.index(
  { programSemesterId: 1, subjectId: 1 },
  { unique: true }
);

const SemesterSubject =
  mongoose.models.SemesterSubject ||
  mongoose.model("SemesterSubject", semesterSubjectSchema);
export default SemesterSubject;