import mongoose from "mongoose";
import Subject from "../../Models/Subject.js";


// ==========================================
// CREATE SUBJECT
// ==========================================
export const createSubject = async (req, res) => {
  try {
    const {
      name,
      code,
      degreeClassId,
      creditHours,
      isActive,
    } = req.body;

    // Required fields
    if (!name || !code || !degreeClassId) {
      return res.status(400).json({
        success: false,
        message: "name, code and degreeClassId are required",
      });
    }

    // Validate DegreeClass ID
    if (!mongoose.Types.ObjectId.isValid(degreeClassId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid degreeClassId",
      });
    }

    // Check duplicate subject
    const existingSubject = await Subject.findOne({
      code: code.toUpperCase(),
      degreeClassId,
    });

    if (existingSubject) {
      return res.status(409).json({
        success: false,
        message:
          "Subject with this code already exists for this degree class",
      });
    }

    // Create subject
    const subject = await Subject.create({
      name,
      code,
      degreeClassId,
      creditHours,
      isActive,
    });

    // Populate DegreeClass + Department
    const populatedSubject = await Subject.findById(subject._id)
      .populate({
        path: "degreeClassId",
        populate: {
          path: "departmentId",
        },
      });

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: populatedSubject,
    });
  } catch (error) {
    console.error("Create Subject Error:", error);

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Subject already exists for this degree class",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ==========================================
// GET ALL SUBJECTS
// ==========================================
export const getAllSubjects = async (req, res) => {
  try {
    const {
      degreeClassId,
      isActive,
      search,
    } = req.query;

    const filter = {};

    // Degree Class filter
    if (degreeClassId) {
      if (!mongoose.Types.ObjectId.isValid(degreeClassId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid degreeClassId",
        });
      }

      filter.degreeClassId = degreeClassId;
    }

    // Active filter
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Search by name or code
    if (search) {
      filter.$or = [
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          code: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const subjects = await Subject.find(filter)
      .populate({
        path: "degreeClassId",
        populate: {
          path: "departmentId",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      data: subjects,
    });
  } catch (error) {
    console.error("Get Subjects Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ==========================================
// GET SUBJECT BY ID
// ==========================================
export const getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Subject ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(id)
      .populate({
        path: "degreeClassId",
        populate: {
          path: "departmentId",
        },
      });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error("Get Subject Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ==========================================
// UPDATE SUBJECT
// ==========================================
export const updateSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Subject ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const {
      name,
      code,
      degreeClassId,
      creditHours,
      isActive,
    } = req.body;

    // Validate DegreeClass ID if provided
    if (
      degreeClassId &&
      !mongoose.Types.ObjectId.isValid(degreeClassId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid degreeClassId",
      });
    }

    // Find existing subject
    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // New values or existing values
    const updatedCode = code
      ? code.toUpperCase()
      : subject.code;

    const updatedDegreeClassId =
      degreeClassId || subject.degreeClassId;

    // Check duplicate subject
    const duplicateSubject = await Subject.findOne({
      _id: { $ne: id },
      code: updatedCode,
      degreeClassId: updatedDegreeClassId,
    });

    if (duplicateSubject) {
      return res.status(409).json({
        success: false,
        message:
          "Another subject with this code already exists for this degree class",
      });
    }

    // Update fields
    if (name !== undefined) {
      subject.name = name;
    }

    if (code !== undefined) {
      subject.code = updatedCode;
    }

    if (degreeClassId !== undefined) {
      subject.degreeClassId = degreeClassId;
    }

    if (creditHours !== undefined) {
      subject.creditHours = creditHours;
    }

    if (isActive !== undefined) {
      subject.isActive = isActive;
    }

    await subject.save();

    // Get updated subject with DegreeClass + Department
    const updatedSubject = await Subject.findById(id)
      .populate({
        path: "degreeClassId",
        populate: {
          path: "departmentId",
        },
      });

    return res.status(200).json({
      success: true,
      message: "Subject updated successfully",
      data: updatedSubject,
    });
  } catch (error) {
    console.error("Update Subject Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Subject already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ==========================================
// DELETE SUBJECT
// ==========================================
export const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Subject ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findByIdAndDelete(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Delete Subject Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// ==========================================
// TOGGLE SUBJECT STATUS
// ==========================================
export const toggleSubjectStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate Subject ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid subject ID",
      });
    }

    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Toggle status
    subject.isActive = !subject.isActive;

    await subject.save();

    // Populate DegreeClass + Department
    const updatedSubject = await Subject.findById(id)
      .populate({
        path: "degreeClassId",
        populate: {
          path: "departmentId",
        },
      });

    return res.status(200).json({
      success: true,
      message: `Subject ${
        updatedSubject.isActive
          ? "activated"
          : "deactivated"
      } successfully`,
      data: updatedSubject,
    });
  } catch (error) {
    console.error("Toggle Subject Status Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};