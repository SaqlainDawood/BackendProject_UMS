import mongoose from "mongoose";

import BatchSemesterSubject from "../../../Models/BatchSemesterSubject.js";
import Batch from "../../../Models/Batch.js";
import Subject from "../../../Models/Subject.js";

/**
 * ============================================
 * Helper: Populate Assignment
 * ============================================
 */
const populateAssignment = (query) => {
  return query
    .populate({
      path: "batchId",
      select:
        "departmentId degreeClassId shiftId startSessionId totalSemesters currentSemester status",
      populate: [
        {
          path: "departmentId",
          select: "name code campusId",
          populate: {
            path: "campusId",
            select: "name code",
          },
        },
        {
          path: "degreeClassId",
          select: "name code duration departmentId",
        },
        {
          path: "shiftId",
          select: "name code",
        },
        {
          path: "startSessionId",
          select: "name year term startDate endDate",
        },
      ],
    })
    .populate({
      path: "subjectId",
      select: "name code degreeClassId creditHours isActive",
      populate: {
        path: "degreeClassId",
        select: "name code duration departmentId",
        populate: {
          path: "departmentId",
          select: "name code campusId",
          populate: {
            path: "campusId",
            select: "name code",
          },
        },
      },
    });
};

/**
 * ============================================
 * Helper: Validate ObjectId
 * ============================================
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * ============================================
 * Helper: Validate Batch + Subject Assignment
 * ============================================
 */
const validateAssignmentData = async ({
  batchId,
  subjectId,
  semester,
}) => {
  // ------------------------------------------
  // Validate ObjectIds
  // ------------------------------------------
  if (!isValidObjectId(batchId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid batch ID",
    };
  }

  if (!isValidObjectId(subjectId)) {
    return {
      valid: false,
      status: 400,
      message: "Invalid subject ID",
    };
  }

  // ------------------------------------------
  // Validate Semester
  // ------------------------------------------
  if (
    semester === undefined ||
    semester === null ||
    semester === ""
  ) {
    return {
      valid: false,
      status: 400,
      message: "Semester is required",
    };
  }

  const semesterNumber = Number(semester);

  if (!Number.isInteger(semesterNumber)) {
    return {
      valid: false,
      status: 400,
      message: "Semester must be a valid integer",
    };
  }

  if (semesterNumber < 1) {
    return {
      valid: false,
      status: 400,
      message: "Semester must be at least 1",
    };
  }

  // ------------------------------------------
  // Find Batch
  // ------------------------------------------
  const batch = await Batch.findById(batchId);

  if (!batch) {
    return {
      valid: false,
      status: 404,
      message: "Batch not found",
    };
  }

  // ------------------------------------------
  // Validate Batch Status
  // ------------------------------------------
  if (batch.status !== "active") {
    return {
      valid: false,
      status: 400,
      message: "Subjects cannot be assigned to a completed batch",
    };
  }

  // ------------------------------------------
  // Validate Semester against Batch
  // ------------------------------------------
  if (semesterNumber > batch.totalSemesters) {
    return {
      valid: false,
      status: 400,
      message: `Invalid semester. This batch has only ${batch.totalSemesters} semesters`,
    };
  }

  // ------------------------------------------
  // Find Subject
  // ------------------------------------------
  const subject = await Subject.findById(subjectId);

  if (!subject) {
    return {
      valid: false,
      status: 404,
      message: "Subject not found",
    };
  }

  // ------------------------------------------
  // Validate Subject Status
  // ------------------------------------------
  if (!subject.isActive) {
    return {
      valid: false,
      status: 400,
      message: "Inactive subject cannot be assigned",
    };
  }

  // ------------------------------------------
  // Validate Degree Class
  // ------------------------------------------
  if (
    batch.degreeClassId.toString() !==
    subject.degreeClassId.toString()
  ) {
    return {
      valid: false,
      status: 400,
      message:
        "Selected subject does not belong to this batch's degree class",
    };
  }

  return {
    valid: true,
    batch,
    subject,
    semester: semesterNumber,
  };
};

/**
 * ============================================
 * CREATE
 * Assign Subject to Batch Semester
 * ============================================
 *
 * POST /api/batch-semester-subjects
 */
export const createBatchSemesterSubject = async (req, res) => {
  try {
    const {
      batchId,
      semester,
      subjectId,
      isActive = true,
    } = req.body;

    // ------------------------------------------
    // Required Fields
    // ------------------------------------------
    if (!batchId || !semester || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "batchId, semester and subjectId are required",
      });
    }

    // ------------------------------------------
    // Validate Batch + Subject
    // ------------------------------------------
    const validation = await validateAssignmentData({
      batchId,
      subjectId,
      semester,
    });

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    // ------------------------------------------
    // Check Duplicate Assignment
    // ------------------------------------------
    const existingAssignment =
      await BatchSemesterSubject.findOne({
        batchId,
        semester: validation.semester,
        subjectId,
      });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this batch semester",
      });
    }

    // ------------------------------------------
    // Create Assignment
    // ------------------------------------------
    const assignment = await BatchSemesterSubject.create({
      batchId,
      semester: validation.semester,
      subjectId,
      isActive,
    });

    // ------------------------------------------
    // Return Populated Data
    // ------------------------------------------
    const populatedAssignment =
      await populateAssignment(
        BatchSemesterSubject.findById(assignment._id)
      );

    return res.status(201).json({
      success: true,
      message:
        "Subject assigned to batch semester successfully",
      data: populatedAssignment,
    });
  } catch (error) {
    console.error(
      "Create Batch Semester Subject Error:",
      error
    );

    // MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this batch semester",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to assign subject to batch semester",
      error: error.message,
    });
  }
};

/**
 * ============================================
 * GET ALL
 * Get Batch Semester Subjects
 * ============================================
 *
 * GET /api/batch-semester-subjects
 *
 * Optional filters:
 *
 * ?batchId=xxx
 * ?semester=1
 * ?subjectId=xxx
 * ?isActive=true
 */
export const getBatchSemesterSubjects = async (req, res) => {
  try {
    const {
      batchId,
      semester,
      subjectId,
      isActive,
    } = req.query;

    const filter = {};

    // ------------------------------------------
    // Batch Filter
    // ------------------------------------------
    if (batchId) {
      if (!isValidObjectId(batchId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid batch ID",
        });
      }

      filter.batchId = batchId;
    }

    // ------------------------------------------
    // Semester Filter
    // ------------------------------------------
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

    // ------------------------------------------
    // Subject Filter
    // ------------------------------------------
    if (subjectId) {
      if (!isValidObjectId(subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID",
        });
      }

      filter.subjectId = subjectId;
    }

    // ------------------------------------------
    // Active Filter
    // ------------------------------------------
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // ------------------------------------------
    // Fetch Data
    // ------------------------------------------
    const assignments = await populateAssignment(
      BatchSemesterSubject.find(filter)
    ).sort({
      semester: 1,
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error(
      "Get Batch Semester Subjects Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch batch semester subjects",
      error: error.message,
    });
  }
};

/**
 * ============================================
 * GET BY ID
 * ============================================
 *
 * GET /api/batch-semester-subjects/:id
 */
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

    const assignment = await populateAssignment(
      BatchSemesterSubject.findById(id)
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Batch semester subject assignment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error(
      "Get Batch Semester Subject By ID Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch batch semester subject assignment",
      error: error.message,
    });
  }
};

/**
 * ============================================
 * UPDATE
 * ============================================
 *
 * PUT /api/batch-semester-subjects/:id
 *
 * batchId cannot be changed.
 * You can change:
 * - semester
 * - subjectId
 * - isActive
 */
export const updateBatchSemesterSubject = async (
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

    // ------------------------------------------
    // Find Existing Assignment
    // ------------------------------------------
    const existingAssignment =
      await BatchSemesterSubject.findById(id);

    if (!existingAssignment) {
      return res.status(404).json({
        success: false,
        message: "Batch semester subject assignment not found",
      });
    }

    // ------------------------------------------
    // Get Values
    // ------------------------------------------
    const semester =
      req.body.semester ?? existingAssignment.semester;

    const subjectId =
      req.body.subjectId ??
      existingAssignment.subjectId.toString();

    const isActive =
      req.body.isActive ?? existingAssignment.isActive;

    // ------------------------------------------
    // Validate Assignment
    // ------------------------------------------
    const validation = await validateAssignmentData({
      batchId: existingAssignment.batchId,
      subjectId,
      semester,
    });

    if (!validation.valid) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    // ------------------------------------------
    // Check Duplicate
    // ------------------------------------------
    const duplicate =
      await BatchSemesterSubject.findOne({
        _id: { $ne: id },
        batchId: existingAssignment.batchId,
        semester: validation.semester,
        subjectId,
      });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this batch semester",
      });
    }

    // ------------------------------------------
    // Update
    // ------------------------------------------
    existingAssignment.semester =
      validation.semester;

    existingAssignment.subjectId = subjectId;

    existingAssignment.isActive = isActive;

    await existingAssignment.save();

    // ------------------------------------------
    // Return Updated Data
    // ------------------------------------------
    const updatedAssignment =
      await populateAssignment(
        BatchSemesterSubject.findById(id)
      );

    return res.status(200).json({
      success: true,
      message:
        "Batch semester subject updated successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error(
      "Update Batch Semester Subject Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "This subject is already assigned to this batch semester",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update batch semester subject",
      error: error.message,
    });
  }
};

/**
 * ============================================
 * DELETE
 * ============================================
 *
 * DELETE /api/batch-semester-subjects/:id
 */
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
      await BatchSemesterSubject.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Batch semester subject assignment not found",
      });
    }

    await BatchSemesterSubject.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message:
        "Subject removed from batch semester successfully",
    });
  } catch (error) {
    console.error(
      "Delete Batch Semester Subject Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete batch semester subject",
      error: error.message,
    });
  }
};

/**
 * ============================================
 * TOGGLE STATUS
 * ============================================
 *
 * PATCH /api/batch-semester-subjects/:id/toggle-status
 */
export const toggleBatchSemesterSubjectStatus = async (
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
      await BatchSemesterSubject.findById(id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Batch semester subject assignment not found",
      });
    }

    assignment.isActive = !assignment.isActive;

    await assignment.save();

    const updatedAssignment =
      await populateAssignment(
        BatchSemesterSubject.findById(id)
      );

    return res.status(200).json({
      success: true,
      message: `Subject assignment ${
        assignment.isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedAssignment,
    });
  } catch (error) {
    console.error(
      "Toggle Batch Semester Subject Status Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update subject assignment status",
      error: error.message,
    });
  }
};