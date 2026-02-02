import Student from "../../Models/StudentModel.js";
import mongoose from "mongoose";
import User from '../../Models/userModel.js'
export const StudentView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Student ID format",
      });
    }
    // console.log("Student ID Receive:", req.params.id);
    const student = await Student.findById(req.params.id).populate(
      "user",
      "email"
    );
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "This Student is not Found!!!!!!",
      });
    }
    if (!student.user) {
      return res.status(404).json({
        success: false,
        message: "Student found but no email assigned (user reference missing)",
      });
    }
    res.status(200).json({
      success: true,
      message: "Student Found Successfully",
      student: student,
    });
  } catch (error) {
    console.error("Error in getStudentById:", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format",
      });
    }
    res.status(500).json({
      success: false,
      message: "Error fetching student details",
      error: error.message,
    });
  }
};

export const StduentUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    // console.log("Update Student with ID :", id);
    // console.log("Update Data :", updateData);
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }
    const existingStudent = await Student.findById(id).populate("user" , "email");
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }
    // Update student
    const updatedStudent = await Student.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validations
      }
    );

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error in updateStudent:", error);

    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format",
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors,
      });
    }
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        field: field,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating student",
      error: error.message,
    });
  }
};

export const StudentDeleteById = async (req, res) => {
  // console.log("Delete Request Student ID is:", req.params.id);

  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }
    const deletedStudent = await Student.findById(req.params.id);
    if (!deletedStudent) {
      return res.status(404).json({
        success: false,
        message: " Deleted Student not found",
      });
    }
    await User.findByIdAndDelete(deletedStudent.user);
    await Student.findByIdAndDelete(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Student Deleted Successfully",
      deletedStudent: {
        id: deletedStudent._id,
        name: `${deletedStudent.firstName} ${deletedStudent.lastName}`,
        rollNo: deletedStudent.rollNo,
      },
    });
  } catch (error) {
    console.log("Student Deletion Error", error);
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID format",
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const bulkDeleteStudent = async (req, res) => {
  try {
    const { studentIds } = req.body;
    const result = await Student.deleteMany({
      _id: { $in: studentIds }, // MongoDB: delete where ID is in array
    });
    res.json({
      success: true,
      message: `${result.deletedCount} students deleted successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error in bulk deletion",
    });
  }
};
