import mongoose from "mongoose";

import Student from "../../../Models/StudentModel.js";
import Batch from "../../../Models/Batch.js";
import StudentSemester from "../../../Models/Student/StudentSemester.js";
import BatchSemesterSubject from "../../../Models/BatchSemesterSubject.js";
import TeacherSubject from "../../../Models/TeacherSubject.js";


// =====================================================
// CREATE STUDENT SEMESTER
// =====================================================
// POST /api/admin/student-semesters
//
// Payload:
// {
//   "studentId": "...",
//   "batchId": "...",
//   "semester": 1,
//   "session": "2025-26"
// }

export const createStudentSemester = async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      semester,
      session = "",
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(studentId) ||
      !mongoose.Types.ObjectId.isValid(batchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId or batchId",
      });
    }

    const semesterNumber = Number(semester);

    if (!Number.isInteger(semesterNumber) || semesterNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Semester must be a positive integer",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // Check duplicate semester
    const existingSemester = await StudentSemester.findOne({
      studentId,
      batchId,
      semester: semesterNumber,
    });

    if (existingSemester) {
      return res.status(409).json({
        success: false,
        message: "This semester already exists for this student",
        data: existingSemester,
      });
    }

    // -------------------------------------------------
    // Automatically get all subjects of this
    // batch + semester
    // -------------------------------------------------

    const batchSubjects = await BatchSemesterSubject.find({
      batchId,
      semester: semesterNumber,
      isActive: true,
    }).populate("subjectId", "name code creditHours");

    if (batchSubjects.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No subjects found for this batch and semester",
      });
    }

    // -------------------------------------------------
    // Get teacher assignments
    // -------------------------------------------------

    const batchSemesterSubjectIds = batchSubjects.map(
      (item) => item._id
    );

    const teacherAssignments = await TeacherSubject.find({
      batchSemesterSubjectId: {
        $in: batchSemesterSubjectIds,
      },
      isActive: true,
    });

    // -------------------------------------------------
    // Build student subjects
    // -------------------------------------------------

    const subjects = batchSubjects.map((item) => {
      const assignment = teacherAssignments.find(
        (teacher) =>
          teacher.batchSemesterSubjectId.toString() ===
          item._id.toString()
      );

      return {
        batchSemesterSubjectId: item._id,
        subjectId: item.subjectId._id,
        teacherId: assignment
          ? assignment.teacherId
          : null,
        subjectStatus: "enrolled",
      };
    });

    const totalCreditHours = batchSubjects.reduce(
      (total, item) =>
        total + Number(item.subjectId?.creditHours || 0),
      0
    );

    const studentSemester = await StudentSemester.create({
      studentId,
      batchId,
      semester: semesterNumber,
      session,
      subjects,
      totalCreditHours,
      status: "in-progress",
    });

    const populatedSemester =
      await StudentSemester.findById(studentSemester._id)
        .populate("studentId")
        .populate("batchId")
        .populate({
          path: "subjects.subjectId",
          select: "name code creditHours",
        })
        .populate({
          path: "subjects.teacherId",
          select: "name email",
        });

    return res.status(201).json({
      success: true,
      message: "Student semester created successfully",
      data: populatedSemester,
    });
  } catch (error) {
    console.error("createStudentSemester:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create student semester",
      error: error.message,
    });
  }
};


// =====================================================
// ADD / UPDATE SUBJECT
// =====================================================
// PUT /api/admin/student-semesters/:id/subjects
//
// Payload:
// {
//   "batchSemesterSubjectId": "...",
//   "teacherId": "...",
//   "subjectStatus": "enrolled"
// }

export const addOrUpdateSemesterSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      batchSemesterSubjectId,
      teacherId = null,
      subjectStatus = "enrolled",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student semester id",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        batchSemesterSubjectId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid batchSemesterSubjectId",
      });
    }

    if (
      teacherId &&
      !mongoose.Types.ObjectId.isValid(teacherId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }

    const semester = await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    const batchSubject =
      await BatchSemesterSubject.findById(
        batchSemesterSubjectId
      ).populate("subjectId", "name code creditHours");

    if (!batchSubject) {
      return res.status(404).json({
        success: false,
        message: "Batch semester subject not found",
      });
    }

    // Make sure subject belongs to same batch + semester
    if (
      batchSubject.batchId.toString() !==
        semester.batchId.toString() ||
      Number(batchSubject.semester) !==
        Number(semester.semester)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Subject does not belong to this student's batch and semester",
      });
    }

    const existingIndex = semester.subjects.findIndex(
      (subject) =>
        subject.batchSemesterSubjectId.toString() ===
        batchSemesterSubjectId.toString()
    );

    // UPDATE existing subject
    if (existingIndex !== -1) {
      semester.subjects[existingIndex].teacherId =
        teacherId;

      semester.subjects[existingIndex].subjectStatus =
        subjectStatus;

      await semester.save();

      return res.status(200).json({
        success: true,
        message: "Semester subject updated successfully",
        data: semester,
      });
    }

    // ADD new subject
    semester.subjects.push({
      batchSemesterSubjectId,
      subjectId: batchSubject.subjectId._id,
      teacherId,
      subjectStatus,
    });

    semester.totalCreditHours =
      semester.subjects.reduce(
        (total, subject) => {
          if (
            subject.subjectId.toString() ===
            batchSubject.subjectId._id.toString()
          ) {
            return (
              total +
              Number(batchSubject.subjectId.creditHours || 0)
            );
          }

          return total;
        },
        0
      );

    await semester.save();

    return res.status(201).json({
      success: true,
      message: "Subject added to student semester successfully",
      data: semester,
    });
  } catch (error) {
    console.error("addOrUpdateSemesterSubject:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add/update semester subject",
      error: error.message,
    });
  }
};


// =====================================================
// REMOVE SUBJECT FROM STUDENT SEMESTER
// =====================================================
// DELETE /api/admin/student-semesters/:id/subjects/:bssId

export const removeSemesterSubject = async (req, res) => {
  try {
    const { id, bssId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(bssId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid id",
      });
    }

    const semester = await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    const oldLength = semester.subjects.length;

    semester.subjects = semester.subjects.filter(
      (subject) =>
        subject.batchSemesterSubjectId.toString() !== bssId
    );

    if (semester.subjects.length === oldLength) {
      return res.status(404).json({
        success: false,
        message: "Subject not found in this semester",
      });
    }

    await semester.save();

    return res.status(200).json({
      success: true,
      message: "Subject removed successfully",
      data: semester,
    });
  } catch (error) {
    console.error("removeSemesterSubject:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove semester subject",
      error: error.message,
    });
  }
};


// =====================================================
// UPDATE GPA / STATUS
// =====================================================
// PUT /api/admin/student-semesters/:id
//
// Payload:
// {
//   "semesterGPA": 3.25,
//   "status": "completed",
//   "remarks": "Semester completed successfully"
// }

export const updateStudentSemester = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      semesterGPA,
      status,
      remarks,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student semester id",
      });
    }

    const semester = await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    if (semesterGPA !== undefined) {
      const gpa = Number(semesterGPA);

      if (Number.isNaN(gpa) || gpa < 0 || gpa > 4) {
        return res.status(400).json({
          success: false,
          message: "GPA must be between 0 and 4",
        });
      }

      semester.semesterGPA = gpa;
    }

    if (status !== undefined) {
      const allowedStatuses = [
        "in-progress",
        "completed",
        "result-pending",
        "withdrawn",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester status",
        });
      }

      semester.status = status;
    }

    if (remarks !== undefined) {
      semester.remarks = remarks;
    }

    await semester.save();

    return res.status(200).json({
      success: true,
      message: "Student semester updated successfully",
      data: semester,
    });
  } catch (error) {
    console.error("updateStudentSemester:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update student semester",
      error: error.message,
    });
  }
};


// =====================================================
// GET ALL STUDENT SEMESTERS
// =====================================================
// GET /api/admin/student-semesters/student/:studentId

export const getStudentSemesters = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId",
      });
    }

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const semesters = await StudentSemester.find({
      studentId,
    })
      .sort({ semester: 1 })
      .populate("batchId", "batchName startYear endYear")
      .populate({
        path: "subjects.subjectId",
        select: "name code creditHours",
      })
      .populate({
        path: "subjects.teacherId",
        select: "name email",
      });

    return res.status(200).json({
      success: true,
      message: "Student academic record fetched successfully",
      data: {
        student,
        totalSemesters: semesters.length,
        semesters,
      },
    });
  } catch (error) {
    console.error("getStudentSemesters:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student academic record",
      error: error.message,
    });
  }
};


// =====================================================
// GET SINGLE SEMESTER
// =====================================================
// GET /api/admin/student-semesters/:id

export const getStudentSemesterById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student semester id",
      });
    }

    const semester = await StudentSemester.findById(id)
      .populate("studentId")
      .populate("batchId")
      .populate({
        path: "subjects.subjectId",
        select: "name code creditHours",
      })
      .populate({
        path: "subjects.teacherId",
        select: "name email",
      });

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student semester fetched successfully",
      data: semester,
    });
  } catch (error) {
    console.error("getStudentSemesterById:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student semester",
      error: error.message,
    });
  }
};


// =====================================================
// DELETE SEMESTER
// =====================================================
// I recommend NOT exposing this in production because
// academic history should remain permanent.

export const deleteStudentSemester = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student semester id",
      });
    }

    const semester = await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    if (
      semester.status === "completed" ||
      semester.status === "result-pending"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Completed academic semester cannot be deleted",
      });
    }

    await StudentSemester.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Student semester deleted successfully",
    });
  } catch (error) {
    console.error("deleteStudentSemester:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete student semester",
      error: error.message,
    });
  }
};