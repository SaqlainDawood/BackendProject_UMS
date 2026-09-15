import mongoose from "mongoose";

import Student from "../../Models/StudentModel.js";
import StudentSemester from "../../Models/Student/StudentSemester.js";
import StudentMarks from "../../Models/Student/StudentMarks.js";
import StudentAttendance from "../../Models/Student/StudentAttendance.js";
import StudentActivity from "../../Models/Student/StudentActivity.js";
import Batch from "../../Models/Batch.js";


const getLoggedInStudent = async (req) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId) {
    return null;
  }

  return await Student.findOne({
    user: userId,
  });
};


// =====================================================
// 1. MY CURRENT SEMESTER
// =====================================================
// GET /api/student-portal/current-semester

export const getMyCurrentSemester = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    if (!student.batchId) {
      return res.status(404).json({
        success: false,
        message: "Student is not assigned to any batch",
      });
    }

    const batch = await Batch.findById(student.batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Student batch not found",
      });
    }

    // Batch.currentSemester expected
    const currentSemester = Number(batch.currentSemester);

    if (
      !Number.isInteger(currentSemester) ||
      currentSemester <= 0
    ) {
      return res.status(404).json({
        success: false,
        message: "Current semester is not configured for this batch",
      });
    }

    const semester = await StudentSemester.findOne({
      studentId: student._id,
      batchId: student.batchId,
      semester: currentSemester,
    })
      .populate(
        "batchId",
        "batchName startYear endYear currentSemester"
      )
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
        message: "Current semester record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Current semester fetched successfully",
      data: semester,
    });
  } catch (error) {
    console.error("getMyCurrentSemester:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch current semester",
      error: error.message,
    });
  }
};


// =====================================================
// 2. MY ALL SEMESTERS
// =====================================================
// GET /api/student-portal/semesters

export const getMyAllSemesters = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const semesters = await StudentSemester.find({
      studentId: student._id,
    })
      .sort({ semester: 1 })
      .populate(
        "batchId",
        "batchName startYear endYear currentSemester"
      )
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
      message: "All semesters fetched successfully",
      data: {
        totalSemesters: semesters.length,
        semesters,
      },
    });
  } catch (error) {
    console.error("getMyAllSemesters:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch semesters",
      error: error.message,
    });
  }
};


// =====================================================
// 3. MY SUBJECTS
// =====================================================
// GET /api/student-portal/subjects
// Optional:
// GET /api/student-portal/subjects?semester=2

export const getMySubjects = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const filter = {
      studentId: student._id,
    };

    if (req.query.semester !== undefined) {
      const semester = Number(req.query.semester);

      if (!Number.isInteger(semester) || semester <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester",
        });
      }

      filter.semester = semester;
    }

    const semesters = await StudentSemester.find(filter)
      .sort({ semester: 1 })
      .populate({
        path: "subjects.subjectId",
        select: "name code creditHours",
      })
      .populate({
        path: "subjects.teacherId",
        select: "name email",
      });

    const subjects = [];

    semesters.forEach((semester) => {
      semester.subjects.forEach((subject) => {
        subjects.push({
          semester: semester.semester,
          session: semester.session,
          subject: subject.subjectId,
          teacher: subject.teacherId,
          subjectStatus: subject.subjectStatus,
          batchSemesterSubjectId:
            subject.batchSemesterSubjectId,
        });
      });
    });

    return res.status(200).json({
      success: true,
      message: "Student subjects fetched successfully",
      data: {
        totalSubjects: subjects.length,
        subjects,
      },
    });
  } catch (error) {
    console.error("getMySubjects:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects",
      error: error.message,
    });
  }
};


// =====================================================
// 4. MY MARKS
// =====================================================
// GET /api/student-portal/marks
// Optional:
// GET /api/student-portal/marks?semester=1

export const getMyMarks = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const filter = {
      studentId: student._id,
    };

    if (req.query.semester !== undefined) {
      const semester = Number(req.query.semester);

      if (!Number.isInteger(semester) || semester <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester",
        });
      }

      filter.semester = semester;
    }

    const marks = await StudentMarks.find(filter)
      .sort({
        semester: 1,
        createdAt: 1,
      })
      .populate({
        path: "subjectId",
        select: "name code creditHours",
      })
      .populate({
        path: "teacherId",
        select: "name email",
      })
      .populate(
        "batchId",
        "batchName startYear endYear"
      );

    return res.status(200).json({
      success: true,
      message: "Student marks fetched successfully",
      data: {
        totalRecords: marks.length,
        marks,
      },
    });
  } catch (error) {
    console.error("getMyMarks:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch marks",
      error: error.message,
    });
  }
};


// =====================================================
// 5. MY ATTENDANCE
// =====================================================
// GET /api/student-portal/attendance
// Optional:
// GET /api/student-portal/attendance?semester=1
// GET /api/student-portal/attendance?semester=1&subjectId=...

export const getMyAttendance = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const filter = {
      studentId: student._id,
    };

    if (req.query.semester !== undefined) {
      const semester = Number(req.query.semester);

      if (!Number.isInteger(semester) || semester <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester",
        });
      }

      filter.semester = semester;
    }

    if (req.query.subjectId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.query.subjectId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid subjectId",
        });
      }

      filter.subjectId = req.query.subjectId;
    }

    const attendance = await StudentAttendance.find(filter)
      .sort({
        date: -1,
      })
      .populate({
        path: "subjectId",
        select: "name code creditHours",
      })
      .populate({
        path: "teacherId",
        select: "name email",
      });

    // Summary
    const total = attendance.length;

    const present = attendance.filter(
      (item) => item.status === "present"
    ).length;

    const absent = attendance.filter(
      (item) => item.status === "absent"
    ).length;

    const leave = attendance.filter(
      (item) => item.status === "leave"
    ).length;

    const percentage =
      total > 0
        ? Number(((present / total) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      success: true,
      message: "Student attendance fetched successfully",
      data: {
        summary: {
          totalClasses: total,
          present,
          absent,
          leave,
          percentage,
        },
        attendance,
      },
    });
  } catch (error) {
    console.error("getMyAttendance:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      error: error.message,
    });
  }
};


// =====================================================
// 6. MY ACTIVITIES
// =====================================================
// GET /api/student-portal/activities
// Optional:
// GET /api/student-portal/activities?semester=1

export const getMyActivities = async (req, res) => {
  try {
    const student = await getLoggedInStudent(req);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }

    const filter = {
      studentId: student._id,
    };

    if (req.query.semester !== undefined) {
      const semester = Number(req.query.semester);

      if (!Number.isInteger(semester) || semester <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester",
        });
      }

      filter.semester = semester;
    }

    const activities = await StudentActivity.find(filter)
      .sort({
        date: -1,
        createdAt: -1,
      })
      .populate(
        "batchId",
        "batchName startYear endYear"
      );

    return res.status(200).json({
      success: true,
      message: "Student activities fetched successfully",
      data: {
        totalActivities: activities.length,
        activities,
      },
    });
  } catch (error) {
    console.error("getMyActivities:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: error.message,
    });
  }
};