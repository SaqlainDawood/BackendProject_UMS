import TeacherAssignment from "../../../Models/Teacherassignment.js";
import SemesterSubject from "../../../Models/Semestersubject.js";
import ProgramSemester from "../../../Models/Programsemester.js";
import Batch from "../../../Models/Batch.js";

export const assignTeacher = async (req, res) => {
  try {
    const { semesterSubjectId, teacherId, batchId, sessionId } = req.body;

    if (!semesterSubjectId || !teacherId || !batchId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "semesterSubjectId, teacherId, batchId aur sessionId required hain",
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch nahi mila" });
    }

    const semesterSubject = await SemesterSubject.findById(semesterSubjectId).populate(
      "programSemesterId"
    );
    if (!semesterSubject) {
      return res.status(404).json({ success: false, message: "SemesterSubject nahi mila" });
    }

    const subjectSemesterNo = semesterSubject.programSemesterId?.semesterNo;
    if (subjectSemesterNo !== batch.currentSemester) {
      return res.status(400).json({
        success: false,
        message: `Ye subject semester ${subjectSemesterNo} ka hai lekin batch abhi semester ${batch.currentSemester} mein hai`,
      });
    }

    const assignment = await TeacherAssignment.create({
      semesterSubjectId,
      teacherId,
      batchId,
      sessionId,
      semesterNo: batch.currentSemester,
    });

    return res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is subject par is batch/session ke liye pehle se hi assignment mojood hai",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssignmentsByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const assignments = await TeacherAssignment.find({ batchId, isActive: true })
      .populate({
        path: "semesterSubjectId",
        populate: { path: "subjectId", select: "name code creditHours" },
      })
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name email" },
      })
      .populate("sessionId", "name term year");

    return res.status(200).json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAssignmentsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const assignments = await TeacherAssignment.find({ teacherId, isActive: true })
      .populate({
        path: "semesterSubjectId",
        populate: { path: "subjectId", select: "name code creditHours" },
      })
      .populate("batchId")
      .populate("sessionId", "name term year");

    return res.status(200).json({ success: true, count: assignments.length, data: assignments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const reassignTeacher = async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) {
      return res.status(400).json({ success: false, message: "teacherId required hai" });
    }

    const assignment = await TeacherAssignment.findByIdAndUpdate(
      req.params.id,
      { teacherId },
      { new: true, runValidators: true }
    );

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    }
    return res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deactivateAssignment = async (req, res) => {
  try {
    const assignment = await TeacherAssignment.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment nahi mila" });
    }
    return res.status(200).json({ success: true, message: "Assignment deactivate ho gaya" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};