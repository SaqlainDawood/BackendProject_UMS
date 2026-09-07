import TeacherSubject from "../../../Models/TeacherSubject.js";
import Subject from "../../../Models/Subject.js";
import Faculty from "../../../Models/TeacherModel.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }
  if (err.code === 11000) {
    return "This subject is already assigned to this teacher";
  }
  if (err.name === "ValidationError") {
    return Object.values(err.errors).map((e) => e.message).join(", ");
  }
  return err.message || "Something went wrong, please try again";
}

/* =========================================================
   GET SUBJECTS AVAILABLE FOR A DEPARTMENT
   GET /api/teacher-subjects/department-subjects/:departmentId

   Frontend flow: admin picks a Department for the teacher ->
   this returns every Subject in that department, so the UI can
   show them as assignable options.
========================================================= */

export const getDepartmentSubjects = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const subjects = await Subject.find({ departmentId, isActive: true })
      .populate("degreeClassId", "name code")
      .sort({ semester: 1, name: 1 });

    return res.json({ success: true, data: subjects });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   ASSIGN SUBJECT TO TEACHER
   POST /api/teacher-subjects
   body: { teacherId, subjectId }
========================================================= */

export const assignSubjectToTeacher = async (req, res) => {
  try {
    const { teacherId, subjectId } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "teacherId and subjectId are required",
      });
    }

    const [teacher, subject] = await Promise.all([
      Faculty.findById(teacherId),
      Subject.findById(subjectId),
    ]);

    if (!teacher) {
      return res.status(400).json({ success: false, message: "Invalid teacherId" });
    }
    if (!subject) {
      return res.status(400).json({ success: false, message: "Invalid subjectId" });
    }

    if (!teacher.departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "This teacher does not have a department set (departmentId). Please set it before assigning subjects.",
      });
    }

    // Wrong-department subject assignment prevent
    if (String(teacher.departmentId) !== String(subject.departmentId)) {
      return res.status(400).json({
        success: false,
        message: "This subject does not belong to the teacher's department",
      });
    }

    // Duplicate assignment prevent (DB unique index bhi hai, yahan clear message ke liye pehle check)
    const alreadyAssigned = await TeacherSubject.findOne({ teacherId, subjectId });
    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "This subject is already assigned to this teacher",
      });
    }

    const assignment = await TeacherSubject.create({ teacherId, subjectId });

    const populated = await TeacherSubject.findById(assignment._id)
      .populate("teacherId", "firstName lastName employeeID")
      .populate({
        path: "subjectId",
        populate: [
          { path: "departmentId", select: "name code" },
          { path: "degreeClassId", select: "name code" },
        ],
      });

    return res.status(201).json({
      success: true,
      message: "Subject assigned to teacher successfully",
      data: populated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   UNASSIGN SUBJECT FROM TEACHER
   DELETE /api/teacher-subjects
   body: { teacherId, subjectId }
========================================================= */

export const unassignSubjectFromTeacher = async (req, res) => {
  try {
    const { teacherId, subjectId } = req.body;

    if (!teacherId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "teacherId and subjectId are required",
      });
    }

    const deleted = await TeacherSubject.findOneAndDelete({ teacherId, subjectId });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "This subject is not assigned to this teacher",
      });
    }

    return res.json({ success: true, message: "Subject unassigned from teacher successfully" });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   GET SUBJECTS ASSIGNED TO A TEACHER
   GET /api/teacher-subjects/:teacherId
========================================================= */

export const getAssignedSubjects = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const assignments = await TeacherSubject.find({ teacherId })
      .populate({
        path: "subjectId",
        populate: [
          { path: "departmentId", select: "name code" },
          { path: "degreeClassId", select: "name code" },
        ],
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: assignments });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};