import mongoose from "mongoose";

import BatchSemesterSubject from "../../Models/BatchSemesterSubject.js";
import TeacherSubject from "../../Models/TeacherSubject.js";

import Batch from "../../Models/Batch.js";
import Subject from "../../Models/Subject.js";
import Teacher from "../../Models/TeacherModel.js";


/* =========================================================
   CLEAN ERROR
========================================================= */

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }

  if (err.code === 11000) {
    return "This record already exists";
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
   POPULATE BATCH SEMESTER SUBJECT
========================================================= */

const populateBatchSemesterSubject = (query) => {
  return query
    .populate({
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
    })
    .populate({
      path: "subjectId",
      select: "name code creditHours semester isActive degreeClassId",
    });
};


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
          select: "name code creditHours semester isActive degreeClassId",
        },
      ],
    });
};


/* =========================================================
   CREATE / ASSIGN SUBJECT TO BATCH SEMESTER
   + SAVE TEACHER ASSIGNMENT SEPARATELY

   POST /api/batch-semester-subjects
========================================================= */

export const createBatchSemesterSubject = async (req, res) => {
  try {
    const {
      batchId,
      semester,
      subjectId,
      teacherId,
      isActive,
    } = req.body;


    /* =====================================================
       REQUIRED FIELDS
    ===================================================== */

    if (!batchId || !semester || !subjectId || !teacherId) {
      return res.status(400).json({
        success: false,
        message:
          "batchId, semester, subjectId and teacherId are required",
      });
    }


    /* =====================================================
       VALIDATE IDs
    ===================================================== */

    if (!isValidObjectId(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid batchId",
      });
    }

    if (!isValidObjectId(subjectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subjectId",
      });
    }

    if (!isValidObjectId(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacherId",
      });
    }


    /* =====================================================
       VALIDATE SEMESTER
    ===================================================== */

    const semesterNumber = Number(semester);

    if (
      !Number.isInteger(semesterNumber) ||
      semesterNumber < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Semester must be a valid positive number",
      });
    }


    /* =====================================================
       GET BATCH + SUBJECT + TEACHER
    ===================================================== */

    const [batch, subject, teacher] = await Promise.all([
      Batch.findById(batchId),
      Subject.findById(subjectId),
      Teacher.findById(teacherId),
    ]);


    /* =====================================================
       BATCH CHECK
    ===================================================== */

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }


    /* =====================================================
       SUBJECT CHECK
    ===================================================== */

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    if (subject.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This subject is inactive and cannot be assigned",
      });
    }


    /* =====================================================
       TEACHER CHECK
    ===================================================== */

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    if (teacher.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This teacher is inactive and cannot be assigned",
      });
    }


    /* =====================================================
       BATCH SEMESTER CHECK
    ===================================================== */

    if (
      batch.totalSemesters &&
      semesterNumber > batch.totalSemesters
    ) {
      return res.status(400).json({
        success: false,
        message:
          `This batch only has ${batch.totalSemesters} semesters`,
      });
    }


    /* =====================================================
       SUBJECT SEMESTER CHECK
    ===================================================== */

    if (
      subject.semester &&
      Number(subject.semester) !== semesterNumber
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Subject "${subject.name}" belongs to semester ${subject.semester}, ` +
          `so it cannot be assigned to semester ${semesterNumber}`,
      });
    }


    /* =====================================================
       DEGREE CLASS CHECK
    ===================================================== */

    if (
      String(batch.degreeClassId) !==
      String(subject.degreeClassId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This subject does not belong to the degree class of this batch",
      });
    }


    /* =====================================================
       CHECK BATCH SEMESTER SUBJECT
    ===================================================== */

    let batchSemesterSubject =
      await BatchSemesterSubject.findOne({
        batchId,
        semester: semesterNumber,
        subjectId,
      });


    /* =====================================================
       CREATE BATCH SEMESTER SUBJECT
       IF NOT EXISTS
    ===================================================== */

    if (!batchSemesterSubject) {
      batchSemesterSubject =
        await BatchSemesterSubject.create({
          batchId,
          semester: semesterNumber,
          subjectId,
          isActive:
            isActive !== undefined
              ? isActive
              : true,
        });
    }


    /* =====================================================
       CHECK TEACHER ASSIGNMENT
    ===================================================== */

    const existingTeacherSubject =
      await TeacherSubject.findOne({
        teacherId,
        batchSemesterSubjectId:
          batchSemesterSubject._id,
      });

    if (existingTeacherSubject) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this teacher",
        data: existingTeacherSubject,
      });
    }


    /* =====================================================
       SAVE TEACHER ASSIGNMENT SEPARATELY
    ===================================================== */

    const teacherSubject =
      await TeacherSubject.create({
        teacherId,
        batchSemesterSubjectId:
          batchSemesterSubject._id,
        isActive:
          isActive !== undefined
            ? isActive
            : true,
      });


    /* =====================================================
       POPULATE RESULT
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
        "Subject assigned to teacher successfully",
      data: populated,
    });

  } catch (err) {
    console.error(
      "Create Batch Semester Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET ALL BATCH SEMESTER SUBJECTS

   GET /api/batch-semester-subjects

   Filters:
   ?batchId=
   ?semester=
   ?subjectId=
   ?isActive=
========================================================= */

export const getBatchSemesterSubjects = async (req, res) => {
  try {
    const {
      batchId,
      semester,
      subjectId,
      isActive,
    } = req.query;

    const filter = {};


    if (batchId) {
      if (!isValidObjectId(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batchId",
        });
      }

      filter.batchId = batchId;
    }


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

      filter.semester = semesterNumber;
    }


    if (subjectId) {
      if (!isValidObjectId(subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subjectId",
        });
      }

      filter.subjectId = subjectId;
    }


    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }


    const assignments =
      await populateBatchSemesterSubject(
        BatchSemesterSubject.find(filter)
          .sort({
            semester: 1,
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
      "Get Batch Semester Subjects Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET SUBJECTS OF ONE BATCH SEMESTER

   GET /api/batch-semester-subjects/batch/:batchId/semester/:semester
========================================================= */

export const getSubjectsByBatchSemester = async (
  req,
  res
) => {
  try {
    const {
      batchId,
      semester,
    } = req.params;


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


    const batch = await Batch.findById(batchId);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }


    const assignments =
      await populateBatchSemesterSubject(
        BatchSemesterSubject.find({
          batchId,
          semester: semesterNumber,
          isActive: true,
        }).sort({
          createdAt: 1,
        })
      );


    return res.status(200).json({
      success: true,

      data: {
        batch: {
          _id: batch._id,
          degreeClassId: batch.degreeClassId,
          currentSemester: batch.currentSemester,
          totalSemesters: batch.totalSemesters,
        },

        semester: semesterNumber,

        subjects: assignments,
      },
    });

  } catch (err) {
    console.error(
      "Get Batch Semester Subjects Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET ONE BATCH SEMESTER SUBJECT

   GET /api/batch-semester-subjects/:id
========================================================= */

export const getBatchSemesterSubjectById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }


    const assignment =
      await populateBatchSemesterSubject(
        BatchSemesterSubject.findById(id)
      );


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Batch semester subject not found",
      });
    }


    /* =====================================================
       FIND TEACHERS OF THIS SUBJECT
    ===================================================== */

    const teachers =
      await populateTeacherSubject(
        TeacherSubject.find({
          batchSemesterSubjectId: id,
          isActive: true,
        })
      );


    return res.status(200).json({
      success: true,

      data: {
        subject: assignment,
        teachers,
      },
    });

  } catch (err) {
    console.error(
      "Get Batch Semester Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   UPDATE BATCH SEMESTER SUBJECT

   PUT /api/batch-semester-subjects/:id

   TeacherId update nahi hoga.
   Teacher assignment TeacherSubject se manage hogi.

   Allowed:
   isActive
========================================================= */

export const updateBatchSemesterSubject = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      isActive,
    } = req.body;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }


    const assignment =
      await BatchSemesterSubject.findById(id);


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Batch semester subject not found",
      });
    }


    if (isActive !== undefined) {
      assignment.isActive = isActive;
    }


    await assignment.save();


    const updated =
      await populateBatchSemesterSubject(
        BatchSemesterSubject.findById(id)
      );


    return res.status(200).json({
      success: true,
      message:
        "Batch semester subject updated successfully",
      data: updated,
    });

  } catch (err) {
    console.error(
      "Update Batch Semester Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   DELETE BATCH SEMESTER SUBJECT

   DELETE /api/batch-semester-subjects/:id

   TeacherSubject records bhi delete hongay.
========================================================= */

export const deleteBatchSemesterSubject = async (
  req,
  res
) => {
  try {
    const { id } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
    }


    const assignment =
      await BatchSemesterSubject.findByIdAndDelete(id);


    if (!assignment) {
      return res.status(404).json({
        success: false,
        message:
          "Batch semester subject not found",
      });
    }


    /* =====================================================
       DELETE TEACHER ASSIGNMENTS
    ===================================================== */

    await TeacherSubject.deleteMany({
      batchSemesterSubjectId: id,
    });


    return res.status(200).json({
      success: true,
      message:
        "Batch semester subject and teacher assignments deleted successfully",
    });

  } catch (err) {
    console.error(
      "Delete Batch Semester Subject Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};


/* =========================================================
   GET TEACHER'S ALL ASSIGNED SUBJECTS

   GET /api/batch-semester-subjects/teacher/:teacherId

   Returns:

   Teacher
      ↓
   Degree Class
      ↓
   Batch
      ↓
   Semester
      ↓
   Subject
========================================================= */

export const getTeacherAssignedSubjects = async (
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

      const teacherAssignments =
        await populateTeacherSubject(
          TeacherSubject.find({
            ...filter,
            isActive:
              isActive !== undefined
                ? isActive === "true"
                : true,
            batchSemesterSubjectId: {
              $exists: true,
            },
          })
        );

      const filtered =
        teacherAssignments.filter(
          (item) =>
            item.batchSemesterSubjectId?.semester ===
            semesterNumber
        );

      return res.status(200).json({
        success: true,
        count: filtered.length,
        data: filtered,
      });
    }


    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }


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
      "Get Teacher Assigned Subjects Error:",
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

   PUT /api/batch-semester-subjects/teacher-assignment/:id

   Teacher assignment separate model mein update hogi.
========================================================= */

export const updateTeacherSubjectAssignment = async (
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
        message: "Invalid teacher assignment ID",
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
            "This subject is already assigned to this teacher",
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
      "Update Teacher Subject Assignment Error:",
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

   DELETE /api/batch-semester-subjects/teacher-assignment/:id
========================================================= */

export const deleteTeacherSubjectAssignment = async (
  req,
  res
) => {
  try {
    const { id } = req.params;


    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher assignment ID",
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
      "Delete Teacher Subject Assignment Error:",
      err
    );

    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};