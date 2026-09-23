import mongoose from "mongoose";

import Student from "../../Models/Student.js";
import StudentSemester from "../../Models/StudentSemester.js";
import BatchSemesterSubject from "../../Models/BatchSemesterSubject.js";
import Batch from "../../Models/Batch.js";
import Subject from "../../Models/Subject.js";
import TeacherSubject from "../../Models/TeacherSubject.js";
import Teacher from "../../Models/TeacherModel.js";

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const createStudentSemester = async (req, res) => {
  try {
    const {
      studentId,
      batchId,
      semester,
      session,
    } = req.body;

    if (!studentId || !batchId || !semester) {
      return res.status(400).json({
        success: false,
        message: "studentId, batchId and semester are required",
      });
    }

    if (
      !isValidObjectId(studentId) ||
      !isValidObjectId(batchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId or batchId",
      });
    }

    const semesterNumber = Number(semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Semester must be a positive integer",
      });
    }

    // -------------------------
    // Check Student
    // -------------------------

    const student = await Student.findById(studentId);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // -------------------------
    // Check Batch
    // -------------------------

    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    // -------------------------
    // Check duplicate semester
    // -------------------------

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

    // =====================================================
    // GET ALL SUBJECTS OF BATCH + SEMESTER
    // =====================================================

    const batchSemesterSubjects =
      await BatchSemesterSubject.find({
        batchId,
        semester: semesterNumber,
        isActive: true,
      })
        .populate({
          path: "subjectId",
          select: "name code creditHours semester",
        })
        .lean();

    if (!batchSemesterSubjects.length) {
      return res.status(404).json({
        success: false,
        message:
          "No subjects found for this batch and semester",
      });
    }

    // =====================================================
    // GET TEACHERS FOR EACH SUBJECT
    // =====================================================

    const subjectIds = batchSemesterSubjects.map(
      (item) => item._id
    );

    const teacherAssignments = await TeacherSubject.find({
      batchSemesterSubjectId: {
        $in: subjectIds,
      },
      isActive: true,
    })
      .populate({
        path: "teacherId",
        select: "firstName lastName email phoneNo",
      })
      .lean();

    // =====================================================
    // BUILD SUBJECT LIST
    // =====================================================

    const subjects = batchSemesterSubjects.map((bss) => {
      const assignedTeachers = teacherAssignments.filter(
        (assignment) =>
          assignment.batchSemesterSubjectId?.toString() ===
          bss._id.toString()
      );

      // Current architecture multiple teachers allow karti hai
      const teacher =
        assignedTeachers.length > 0
          ? assignedTeachers[0].teacherId?._id
          : null;

      return {
        batchSemesterSubjectId: bss._id,
        subjectId: bss.subjectId?._id,
        teacherId: teacher || null,
        subjectStatus: "enrolled",
      };
    });

    // =====================================================
    // TOTAL CREDIT HOURS
    // =====================================================

    const totalCreditHours =
      batchSemesterSubjects.reduce((total, item) => {
        return (
          total +
          Number(item.subjectId?.creditHours || 0)
        );
      }, 0);

    // =====================================================
    // CREATE SEMESTER RECORD
    // =====================================================

    const studentSemester = await StudentSemester.create({
      studentId,
      batchId,
      semester: semesterNumber,
      session: session || "",
      subjects,
      status: "in-progress",
      semesterGPA: null,
      totalCreditHours,
      remarks: "",
    });

    // =====================================================
    // POPULATE RESPONSE
    // =====================================================

    const populatedSemester =
      await StudentSemester.findById(
        studentSemester._id
      )
        .populate({
          path: "studentId",
          select:
            "firstName lastName registrationNo rollNo",
        })
        .populate({
          path: "batchId",
          select:
            "batchName startYear endYear currentSemester",
        })
        .populate({
          path: "subjects.subjectId",
          select:
            "name code creditHours semester",
        })
        .populate({
          path: "subjects.teacherId",
          select:
            "firstName lastName email phoneNo",
        });

    return res.status(201).json({
      success: true,
      message:
        "Student semester created with all subjects successfully",
      data: populatedSemester,
    });
  } catch (error) {
    console.error(
      "createStudentSemester:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create student semester",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL SEMESTERS OF ONE STUDENT
// =====================================================

export const getStudentSemesters = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId",
      });
    }

    const semesters = await StudentSemester.find({
      studentId,
    })
      .sort({ semester: 1 })
      .populate({
        path: "batchId",
        select:
          "batchName startYear endYear currentSemester",
      })
      .populate({
        path: "subjects.subjectId",
        select:
          "name code creditHours semester",
      })
      .populate({
        path: "subjects.teacherId",
        select:
          "firstName lastName email phoneNo",
      });

    return res.status(200).json({
      success: true,
      message:
        "Student semester history fetched successfully",
      totalSemesters: semesters.length,
      data: semesters,
    });
  } catch (error) {
    console.error(
      "getStudentSemesters:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student semesters",
      error: error.message,
    });
  }
};

// =====================================================
// GET ONE SEMESTER
// =====================================================

export const getStudentSemesterById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester record id",
      });
    }

    const semester = await StudentSemester.findById(id)
      .populate({
        path: "studentId",
        select:
          "firstName lastName registrationNo rollNo",
      })
      .populate({
        path: "batchId",
        select:
          "batchName startYear endYear currentSemester",
      })
      .populate({
        path: "subjects.subjectId",
        select:
          "name code creditHours semester",
      })
      .populate({
        path: "subjects.teacherId",
        select:
          "firstName lastName email phoneNo",
      });

    if (!semester) {
      return res.status(404).json({
        success: false,
        message: "Student semester not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: semester,
    });
  } catch (error) {
    console.error(
      "getStudentSemesterById:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch semester",
      error: error.message,
    });
  }
};

// =====================================================
// GET CURRENT SEMESTER
// Uses student's batch currentSemester
// =====================================================

export const getCurrentStudentSemester = async (
  req,
  res
) => {
  try {
    const { studentId } = req.params;

    if (!isValidObjectId(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studentId",
      });
    }

    const student = await Student.findById(
      studentId
    ).select("batchId");

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!student.batchId) {
      return res.status(400).json({
        success: false,
        message:
          "Student is not assigned to any batch",
      });
    }

    const batch = await Batch.findById(
      student.batchId
    ).select(
      "batchName startYear endYear currentSemester"
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Student batch not found",
      });
    }

    if (!batch.currentSemester) {
      return res.status(404).json({
        success: false,
        message:
          "Current semester is not set in batch",
      });
    }

    const semester =
      await StudentSemester.findOne({
        studentId,
        batchId: student.batchId,
        semester: Number(
          batch.currentSemester
        ),
      })
        .populate({
          path: "batchId",
          select:
            "batchName startYear endYear currentSemester",
        })
        .populate({
          path: "subjects.subjectId",
          select:
            "name code creditHours semester",
        })
        .populate({
          path: "subjects.teacherId",
          select:
            "firstName lastName email phoneNo",
        });

    if (!semester) {
      return res.status(404).json({
        success: false,
        message:
          "Current semester record has not been created for this student",
        currentSemester:
          batch.currentSemester,
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Current semester fetched successfully",
      data: semester,
    });
  } catch (error) {
    console.error(
      "getCurrentStudentSemester:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch current semester",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE SEMESTER STATUS / GPA
// =====================================================

export const updateStudentSemester = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      status,
      semesterGPA,
      remarks,
    } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester record id",
      });
    }

    const semester =
      await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message:
          "Student semester not found",
      });
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

    if (semesterGPA !== undefined) {
      const gpa = Number(semesterGPA);

      if (Number.isNaN(gpa) || gpa < 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester GPA",
        });
      }

      semester.semesterGPA = gpa;
    }

    if (remarks !== undefined) {
      semester.remarks = remarks;
    }

    await semester.save();

    const updated =
      await StudentSemester.findById(id)
        .populate({
          path: "subjects.subjectId",
          select:
            "name code creditHours semester",
        })
        .populate({
          path: "subjects.teacherId",
          select:
            "firstName lastName email phoneNo",
        });

    return res.status(200).json({
      success: true,
      message:
        "Student semester updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error(
      "updateStudentSemester:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update student semester",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE SEMESTER
// =====================================================

export const deleteStudentSemester = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester record id",
      });
    }

    const semester =
      await StudentSemester.findById(id);

    if (!semester) {
      return res.status(404).json({
        success: false,
        message:
          "Student semester not found",
      });
    }

    await StudentSemester.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Student semester deleted successfully",
    });
  } catch (error) {
    console.error(
      "deleteStudentSemester:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete student semester",
      error: error.message,
    });
  }
};