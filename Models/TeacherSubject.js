import mongoose from "mongoose";

const teacherSubjectSchema = new mongoose.Schema(
  {
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty", required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    assignedDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ek teacher ko ek subject sirf ek dafa assign ho (duplicate assignment prevent)
teacherSubjectSchema.index({ teacherId: 1, subjectId: 1 }, { unique: true });

const TeacherSubject =
  mongoose.models.TeacherSubject || mongoose.model("TeacherSubject", teacherSubjectSchema);
export default TeacherSubject;