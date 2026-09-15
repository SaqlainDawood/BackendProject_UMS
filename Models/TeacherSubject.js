import mongoose from "mongoose";

const teacherSubjectSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    batchSemesterSubjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchSemesterSubject",
      required: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Same subject assignment ko same teacher ko duplicate na kare
teacherSubjectSchema.index(
  {
    teacherId: 1,
    batchSemesterSubjectId: 1,
  },
  {
    unique: true,
  }
);

const TeacherSubject = mongoose.model(
  "TeacherSubject",
  teacherSubjectSchema
);

export default TeacherSubject;