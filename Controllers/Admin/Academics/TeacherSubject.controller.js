import mongoose from "mongoose";

import TeacherSubject from "../../../Models/TeacherSubject.js";
import Teacher from "../../../Models/TeacherModel.js";
import BatchSemesterSubject from "../../../Models/BatchSemesterSubject.js";
import Student from "../../../Models/StudentModel.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }
  
  if (err.code === 11000) {
    return "This teacher is already assigned to this subject";
  }

  if (err.name === "ValidationError") {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  return err.message || "Something went wrong, please try again";
}


/* =========================================================
   VALIDATE OBJECT ID
========================================================= */

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}


/* =========================================================
   POPULATE TEACHER SUBJECT
========================================================= */

const populateTeacherSubject = (query) => {
  return query
    .populate({
      path: "teacherId",
      select: "name email employeeId isActive",
    })
    .populate({
      path: "batchSemesterSubjectId",
      populate: [
        {
          path: "batchId",
          populate: [
            {
              path: "departmentId",
              select: "name code",
            },
            {
              path: "degreeClassId",
              select: "name code duration",
            },
            {
              path: "shiftId",
              select: "name",
            },
            {
              path: "startSessionId",
              select: "name term year startDate endDate",
            },
          ],
        },
        {
          path: "subjectId",
          select:
            "name code creditHours semester isActive degreeClassId",
        },
      ],
    });
};


/* =========================================================
   CREATE TEACHER SUBJECT ASSIGNMENT

   POST
   /api/teacher-subjects
========================================================= */

export const createTeacherSubject = async (req, res) => {
  try {
    const {
      teacherId,
      batchSemesterSubjectId,
      isActive,
    } = req.body;


    /* =====================================================
       REQUIRED
    ===================================================== */

    if (!teacherId || !batchSemesterSubjectId) {
      return res.status(400).json({
        success: false,
        message:
          "teacherId and batchSemesterSubjectId are required",
      });
    }


    /* =====================================================
       VALIDATE IDS
    ===================================================== */

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }

    if (!isValidObjectId(batchSemesterSubjectId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid batchSemesterSubjectId",
      });
    }


    /* =====================================================
       CHECK TEACHER
    ===================================================== */

    const teacher =
      await Teacher.findById(teacherId);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (teacher.isActive === false) {
      return res.status(400).json({
        success: false,
        message:
          "This teacher is inactive and cannot be assigned",
      });
    }


    /* =====================================================
       CHECK BATCH SEMESTER SUBJECT
    ===================================================== */

    const batchSemesterSubject =
      await BatchSemesterSubject.findById(
        batchSemesterSubjectId
      );

    if (!batchSemesterSubject) {
      return res.status(404).json({
        success: false,
        message:
          "Batch semester subject not found",
      });
    }

    if (batchSemesterSubject.isActive === false) {
      return res.status(400).json({
        success: false,
        message:
          "This batch semester subject is inactive",
      });
    }


    /* =====================================================
       DUPLICATE CHECK
    ===================================================== */

    const existing =
      await TeacherSubject.findOne({
        teacherId,
        batchSemesterSubjectId,
      });

    if (existing) {
      return res.status(409).json({
        success: false,
        message:
          "This teacher is already assigned to this subject",
        data: existing,
      });
    }


    /* =====================================================
       CREATE
    ===================================================== */

    const teacherSubject =
      await TeacherSubject.create({
        teacherId,
        batchSemesterSubjectId,
        isActive:
          isActive !== undefined
            ? isActive
            : true,
      });


    /* =====================================================
       POPULATE
    ===================================================== */

    const populated =
      await populateTeacherSubject(
        TeacherSubject.findById(
          teacherSubject._id
        )
      );


    return res.status(201).json({
      success: true,
      message:
        "Teacher assigned to subject successfully",
      data: populated,
    });

  } catch (err) {
    console.error(
      "Create Teacher Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET ALL TEACHER SUBJECT ASSIGNMENTS

   GET
   /api/teacher-subjects

   Filters:
   ?teacherId=
   ?batchSemesterSubjectId=
   ?isActive=
========================================================= */

export const getAllTeacherSubjects = async (
  req,
  res
) => {
  try {
    const {
      teacherId,
      batchSemesterSubjectId,
      isActive,
    } = req.query;

    const filter = {};


    /* =====================================================
       TEACHER FILTER
    ===================================================== */

    if (teacherId) {
      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacherId",
        });
      }

      filter.teacherId = teacherId;
    }


    /* =====================================================
       BATCH SEMESTER SUBJECT FILTER
    ===================================================== */

    if (batchSemesterSubjectId) {
      if (!isValidObjectId(batchSemesterSubjectId)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid batchSemesterSubjectId",
        });
      }

      filter.batchSemesterSubjectId =
        batchSemesterSubjectId;
    }


    /* =====================================================
       ACTIVE FILTER
    ===================================================== */

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }


    /* =====================================================
       GET
    ===================================================== */

    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find(filter)
          .sort({
            createdAt: -1,
          })
      );


    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });

  } catch (err) {
    console.error(
      "Get All Teacher Subjects Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET ONE TEACHER SUBJECT ASSIGNMENT

   GET
   /api/teacher-subjects/:id
========================================================= */

export const getTeacherSubjectById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher subject assignment ID",
      });
    }


    const assignment =
      await populateTeacherSubject(
        TeacherSubject.findById(id)
      );


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher subject assignment not found",
      });
    }


    return res.status(200).json({
      success: true,
      data: assignment,
    });

  } catch (err) {
    console.error(
      "Get Teacher Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER ALL SUBJECTS

   GET
   /api/teacher-subjects/teacher/:teacherId
========================================================= */

export const getTeacherSubjects = async (
  req,
  res
) => {
  try {
    const { teacherId } = req.params;

    const {
      semester,
      isActive,
    } = req.query;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    const filter = {
      teacherId,
    };


    /* =====================================================
       ACTIVE
    ===================================================== */

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }


    /* =====================================================
       GET ASSIGNMENTS
    ===================================================== */

    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find(filter)
          .sort({
            createdAt: -1,
          })
      );


    /* =====================================================
       SEMESTER FILTER
    ===================================================== */

    let result = assignments;

    if (semester !== undefined) {
      const semesterNumber = Number(semester);

      if (
        !Number.isInteger(semesterNumber) ||
        semesterNumber < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid semester",
        });
      }

      result = assignments.filter(
        (item) =>
          item.batchSemesterSubjectId?.semester ===
          semesterNumber
      );
    }


    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });

  } catch (err) {
    console.error(
      "Get Teacher Subjects Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER CLASSES

   GET
   /api/teacher-subjects/teacher/:teacherId/classes
========================================================= */

export const getTeacherClasses = async (
  req,
  res
) => {
  try {
    const { teacherId } = req.params;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find({
          teacherId,
          isActive: true,
        })
      );


    const classesMap = new Map();


    assignments.forEach((item) => {
      const bss =
        item.batchSemesterSubjectId;

      const batch =
        bss?.batchId;

      const degreeClass =
        batch?.degreeClassId;

      if (!degreeClass) return;


      const classId =
        String(degreeClass._id);


      if (!classesMap.has(classId)) {
        classesMap.set(classId, {
          _id: degreeClass._id,
          name: degreeClass.name,
          code: degreeClass.code,
        });
      }
    });


    return res.status(200).json({
      success: true,
      count: classesMap.size,
      data: Array.from(classesMap.values()),
    });

  } catch (err) {
    console.error(
      "Get Teacher Classes Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER BATCHES

   GET
   /api/teacher-subjects/teacher/:teacherId/batches
========================================================= */

export const getTeacherBatches = async (
  req,
  res
) => {
  try {
    const { teacherId } = req.params;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find({
          teacherId,
          isActive: true,
        })
      );


    const batchesMap = new Map();


    assignments.forEach((item) => {
      const bss =
        item.batchSemesterSubjectId;

      const batch =
        bss?.batchId;

      if (!batch) return;


      const batchId =
        String(batch._id);


      if (!batchesMap.has(batchId)) {
        batchesMap.set(batchId, {
          _id: batch._id,
          name: batch.name,
          degreeClass: batch.degreeClassId,
        });
      }
    });


    return res.status(200).json({
      success: true,
      count: batchesMap.size,
      data: Array.from(batchesMap.values()),
    });

  } catch (err) {
    console.error(
      "Get Teacher Batches Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER SEMESTERS

   GET
   /api/teacher-subjects/teacher/:teacherId/batch/:batchId/semesters
========================================================= */

export const getTeacherBatchSemesters = async (
  req,
  res
) => {
  try {
    const {
      teacherId,
      batchId,
    } = req.params;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    if (!isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batchId",
      });
    }


    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find({
          teacherId,
          isActive: true,
        })
      );


    const semesters = [
      ...new Set(
        assignments
          .filter(
            (item) =>
              String(
                item.batchSemesterSubjectId?.batchId?._id
              ) === String(batchId)
          )
          .map(
            (item) =>
              item.batchSemesterSubjectId?.semester
          )
          .filter(Boolean)
      ),
    ].sort((a, b) => a - b);


    return res.status(200).json({
      success: true,
      count: semesters.length,
      data: semesters.map((semester) => ({
        semester,
      })),
    });

  } catch (err) {
    console.error(
      "Get Teacher Batch Semesters Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER SUBJECTS BY BATCH

   GET
   /api/teacher-subjects/teacher/:teacherId/batch/:batchId
========================================================= */

export const getTeacherSubjectsByBatch = async (
  req,
  res
) => {
  try {
    const {
      teacherId,
      batchId,
    } = req.params;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    if (!isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batchId",
      });
    }


    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find({
          teacherId,
          isActive: true,
        })
      );


    const result =
      assignments.filter(
        (item) =>
          String(
            item.batchSemesterSubjectId?.batchId?._id
          ) === String(batchId)
      );


    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });

  } catch (err) {
    console.error(
      "Get Teacher Subjects By Batch Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER SUBJECTS BY BATCH + SEMESTER

   GET
   /api/teacher-subjects/teacher/:teacherId/batch/:batchId/semester/:semester
========================================================= */

export const getTeacherSubjectsByBatchSemester = async (
  req,
  res
) => {
  try {
    const {
      teacherId,
      batchId,
      semester,
    } = req.params;


    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    if (!isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batchId",
      });
    }


    const semesterNumber = Number(semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester",
      });
    }


    const assignments =
      await populateTeacherSubject(
        TeacherSubject.find({
          teacherId,
          isActive: true,
        })
      );


    const result =
      assignments.filter((item) => {
        const bss =
          item.batchSemesterSubjectId;

        return (
          String(bss?.batchId?._id) ===
            String(batchId) &&
          Number(bss?.semester) ===
            semesterNumber
        );
      });


    return res.status(200).json({
      success: true,

      data: {
        teacherId,
        batchId,
        semester: semesterNumber,
        subjects: result,
      },
    });

  } catch (err) {
    console.error(
      "Get Teacher Subjects By Batch Semester Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   UPDATE TEACHER SUBJECT ASSIGNMENT

   PUT
   /api/teacher-subjects/:id
========================================================= */

export const updateTeacherSubject = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      teacherId,
      isActive,
    } = req.body;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher subject assignment ID",
      });
    }


    const assignment =
      await TeacherSubject.findById(id);


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher subject assignment not found",
      });
    }


    /* =====================================================
       CHANGE TEACHER
    ===================================================== */

    if (teacherId !== undefined) {
      if (!isValidObjectId(teacherId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid teacherId",
        });
      }


      const teacher =
        await Teacher.findById(teacherId);


      if (!teacher) {
        return res.status(404).json({
          success: false,
          message: "Teacher not found",
        });
      }


      if (teacher.isActive === false) {
        return res.status(400).json({
          success: false,
          message:
            "This teacher is inactive",
        });
      }


      const duplicate =
        await TeacherSubject.findOne({
          teacherId,
          batchSemesterSubjectId:
            assignment.batchSemesterSubjectId,
          _id: {
            $ne: id,
          },
        });


      if (duplicate) {
        return res.status(409).json({
          success: false,
          message:
            "This teacher is already assigned to this subject",
        });
      }


      assignment.teacherId = teacherId;
    }


    /* =====================================================
       ACTIVE STATUS
    ===================================================== */

    if (isActive !== undefined) {
      assignment.isActive = isActive;
    }


    await assignment.save();


    const updated =
      await populateTeacherSubject(
        TeacherSubject.findById(id)
      );


    return res.status(200).json({
      success: true,
      message:
        "Teacher subject assignment updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error(
      "Update Teacher Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   DELETE TEACHER SUBJECT ASSIGNMENT

   DELETE
   /api/teacher-subjects/:id
========================================================= */

export const deleteTeacherSubject = async (
  req,
  res
) => {
  try {
    const { id } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid teacher subject assignment ID",
      });
    }


    const assignment =
      await TeacherSubject.findByIdAndDelete(id);


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Teacher subject assignment not found",
      });
    }


    return res.status(200).json({
      success: true,
      message:
        "Teacher subject assignment deleted successfully",
    });

  } catch (err) {
    console.error(
      "Delete Teacher Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
// GET /api/teacher-subjects/teacher/:teacherId/batch/:batchId/semester/:semester/students
export const getTeacherStudentsByBatchSemester = async (req, res) => {
  try {
    const { teacherId, batchId, semester } = req.params;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(teacherId) ||
      !mongoose.Types.ObjectId.isValid(batchId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId or batchId",
      });
    }

    const semesterNumber = Number(semester);

    if (!Number.isInteger(semesterNumber) || semesterNumber <= 0) {
      return res.status(400).json({
        success: false,
        message: "Semester must be a positive integer",
      });
    }

    // Check teacher assignments
    const teacherSubjects = await TeacherSubject.find({
      teacherId,
      isActive: true,
    }).populate({
      path: "batchSemesterSubjectId",
      populate: [
        {
          path: "subjectId",
          select: "name code creditHours semester",
        },
        {
          path: "batchId",
          select: "batchName startYear endYear",
        },
      ],
    });

    // Only assignments for requested batch + semester
    const assignedSubjects = teacherSubjects.filter((item) => {
      const bss = item.batchSemesterSubjectId;

      if (!bss) return false;

      const assignedBatchId =
        bss.batchId?._id?.toString() || bss.batchId?.toString();

      return (
        assignedBatchId === batchId &&
        Number(bss.semester) === semesterNumber
      );
    });

    if (assignedSubjects.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "This teacher has no subject assigned in this batch and semester",
        data: [],
      });
    }

    // Get students of this batch
    const students = await Student.find({
      batchId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Teacher's class students fetched successfully",
      data: {
        teacherId,
        batchId,
        semester: semesterNumber,

        subjects: assignedSubjects.map((item) => ({
          teacherSubjectId: item._id,
          subject: item.batchSemesterSubjectId.subjectId,
        })),

        totalStudents: students.length,
        students,
      },
    });
  } catch (error) {
    console.error("getTeacherStudentsByBatchSemester:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch teacher students",
      error: error.message,
    });
  }
};