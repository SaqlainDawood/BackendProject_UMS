import Class from "../../../Models/CreateClass.js";
import Student from "../../../Models/StudentModel.js";
import mongoose from "mongoose";
import { 
  validateStudentEnrollment, 
  checkBulkStudentConflicts,
  getStudentCompleteSchedule,
  checkStudentScheduleConflict
} from "../../../utils/scheduleUtils.js";

/**
 * Enroll single student in a class
 * POST /api/classes/:classId/enroll/single
 */
export const enrollSingleStudent = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { classId } = req.params;
    const { studentId, status = 'enrolled' } = req.body;
    
    // Validate inputs
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }
    
    // Validate enrollment
    const validation = await validateStudentEnrollment(studentId, classId, session);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.reason,
        conflicts: validation.conflicts
      });
    }
    
    // Enroll student
    const classData = await Class.findById(classId).session(session);
    
    classData.students.push({
      student: studentId,
      status: status,
      enrollmentDate: new Date()
    });
    
    await classData.save({ session });
    
    // Also update student document (optional - for quick access)
    await Student.findByIdAndUpdate(studentId, {
      $push: { enrolledClasses: classId }
    }).session(session);
    
    await session.commitTransaction();
    
    // Get updated class with populated data
    const updatedClass = await Class.findById(classId)
      .populate('students.student', 'firstName lastName rollNo registrationNo');
    
    res.status(200).json({
      success: true,
      message: "Student enrolled successfully",
      data: {
        class: updatedClass,
        enrollment: {
          studentId: studentId,
          className: validation.classData?.className,
          creditsAdded: validation.classData?.creditHours,
          totalCreditsAfter: validation.newCredits
        }
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error("Error enrolling student:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Enroll multiple students in a class (Bulk Enrollment)
 * POST /api/classes/:classId/enroll/bulk
 */
export const enrollBulkStudents = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { classId } = req.params;
    const { studentIds, status = 'enrolled' } = req.body;
    
    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one student ID is required"
      });
    }
    
    // Get class data first
    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Check capacity
    const currentEnrolled = classData.students.filter(s => s.status === 'enrolled').length;
    const availableSeats = classData.capacity - currentEnrolled;
    
    if (studentIds.length > availableSeats) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot enroll ${studentIds.length} students. Only ${availableSeats} seats available`
      });
    }
    
    // Validate each student
    const validStudents = [];
    const invalidStudents = [];
    const conflicts = [];
    
    for (const studentId of studentIds) {
      const validation = await validateStudentEnrollment(studentId, classId, session);
      
      if (validation.valid) {
        validStudents.push({
          student: studentId,
          status: status,
          enrollmentDate: new Date(),
          validationData: validation
        });
      } else {
        invalidStudents.push({
          studentId: studentId,
          reason: validation.reason,
          conflicts: validation.conflicts
        });
        if (validation.conflicts) {
          conflicts.push(...validation.conflicts);
        }
      }
    }
    
    // Add valid students to class
    if (validStudents.length > 0) {
      classData.students.push(...validStudents);
      await classData.save({ session });
      
      // Update student documents
      for (const valid of validStudents) {
        await Student.findByIdAndUpdate(valid.student, {
          $push: { enrolledClasses: classId }
        }).session(session);
      }
    }
    
    await session.commitTransaction();
    
    // Get updated class
    const updatedClass = await Class.findById(classId)
      .populate('students.student', 'firstName lastName rollNo registrationNo');
    
    res.status(200).json({
      success: true,
      message: `${validStudents.length} students enrolled successfully`,
      data: {
        class: updatedClass,
        summary: {
          totalRequested: studentIds.length,
          successfullyEnrolled: validStudents.length,
          failed: invalidStudents.length
        },
        failedStudents: invalidStudents.length > 0 ? invalidStudents : undefined,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error("Error bulk enrolling students:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Remove student from class (Drop/Withdraw)
 * DELETE /api/classes/:classId/students/:studentId
 */
export const removeStudentFromClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { classId, studentId } = req.params;
    const { reason = 'dropped' } = req.body;
    
    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Find the student enrollment
    const studentIndex = classData.students.findIndex(
      s => s.student.toString() === studentId && s.status === 'enrolled'
    );
    
    if (studentIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Student is not enrolled in this class"
      });
    }
    
    // Update status to 'dropped' instead of deleting (soft delete)
    classData.students[studentIndex].status = reason === 'completed' ? 'completed' : 'dropped';
    await classData.save({ session });
    
    // Remove from student's enrolled classes
    await Student.findByIdAndUpdate(studentId, {
      $pull: { enrolledClasses: classId }
    }).session(session);
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: `Student ${reason === 'completed' ? 'completed' : 'dropped'} from class successfully`,
      data: {
        studentId: studentId,
        classId: classId,
        status: reason === 'completed' ? 'completed' : 'dropped'
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error("Error removing student:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get all enrolled students for a class
 * GET /api/classes/:classId/students
 */
export const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const { status, search, page = 1, limit = 20 } = req.query;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Filter students
    let students = classData.students;
    
    if (status) {
      students = students.filter(s => s.status === status);
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedStudents = students.slice(startIndex, startIndex + limit);
    
    // Get full student details
    const studentIds = paginatedStudents.map(s => s.student);
    const studentDetails = await Student.find({
      _id: { $in: studentIds }
    }).select('firstName lastName rollNo registrationNo cnic phoneNo');
    
    // Combine enrollment data with student details
    const enrichedStudents = paginatedStudents.map(enrollment => {
      const details = studentDetails.find(s => s._id.toString() === enrollment.student.toString());
      return {
        ...enrollment.toObject(),
        studentDetails: details
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        classId: classId,
        className: classData.className,
        classCode: classData.classCode,
        capacity: classData.capacity,
        enrolledCount: classData.students.filter(s => s.status === 'enrolled').length,
        students: enrichedStudents,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(students.length / limit),
          totalStudents: students.length,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error("Error getting class students:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get available students for enrollment (not yet enrolled)
 * GET /api/classes/:classId/available-students
 */
export const getAvailableStudents = async (req, res) => {
    console.log("getAvailableStudents called");
  try {
    const { classId } = req.params;
    const { department, semester, search, page = 1, limit = 20 } = req.query;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    // Get already enrolled student IDs
    const enrolledStudentIds = classData.students
      .filter(s => s.status === 'enrolled')
      .map(s => s.student.toString());
    
    // Build query for eligible students
    const query = {
      status: { $in: ['active', 'approved'] },
      _id: { $nin: enrolledStudentIds }
    };
    
    if (department) {
      query['enrollment.department'] = department;
    }
    
    if (semester) {
      query['enrollment.semester'] = semester;
    }
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } },
        { registrationNo: { $regex: search, $options: 'i' } }
      ];
    }
    
    const totalStudents = await Student.countDocuments(query);
    const students = await Student.find(query)
      .select('firstName lastName rollNo registrationNo cnic phoneNo enrollment')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // ✅ NOW THIS WILL WORK because checkStudentScheduleConflict is imported
    const studentsWithConflictStatus = await Promise.all(
      students.map(async (student) => {
        try {
          const conflicts = await checkStudentScheduleConflict(
            student._id, 
            classData.schedule
          );
          return {
            ...student.toObject(),
            hasScheduleConflict: conflicts.length > 0,
            conflictDetails: conflicts.length > 0 ? conflicts : undefined
          };
        } catch (error) {
          console.error(`Error checking conflicts for student ${student._id}:`, error);
          return {
            ...student.toObject(),
            hasScheduleConflict: false,
            conflictDetails: undefined
          };
        }
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        classId: classId,
        className: classData.className,
        availableSeats: classData.capacity - classData.students.filter(s => s.status === 'enrolled').length,
        totalAvailableStudents: totalStudents,
        students: studentsWithConflictStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalStudents / limit),
          totalStudents: totalStudents,
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error("Full error:", error);
    console.error("Error getting available students:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack  
    });
  }
};

/**
 * Get student's schedule (for viewing)
 * GET /api/students/:studentId/schedule
 */
export const getStudentSchedule = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const schedule = await getStudentCompleteSchedule(studentId);
    
    res.status(200).json({
      success: true,
      data: schedule
    });
    
  } catch (error) {
    console.error("Error getting student schedule:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Update student enrollment status
 * PATCH /api/classes/:classId/students/:studentId/status
 */
export const updateStudentStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { classId, studentId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['enrolled', 'dropped', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    const classData = await Class.findById(classId).session(session);
    if (!classData) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    const studentEnrollment = classData.students.find(
      s => s.student.toString() === studentId
    );
    
    if (!studentEnrollment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Student not found in this class"
      });
    }
    
    studentEnrollment.status = status;
    await classData.save({ session });
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: `Student status updated to ${status}`,
      data: {
        studentId: studentId,
        classId: classId,
        status: status
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error("Error updating student status:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * Get enrollment statistics for a class
 * GET /api/classes/:classId/enrollment-stats
 */
export const getEnrollmentStats = async (req, res) => {
  try {
    const { classId } = req.params;
    
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }
    
    const enrolled = classData.students.filter(s => s.status === 'enrolled');
    const dropped = classData.students.filter(s => s.status === 'dropped');
    const completed = classData.students.filter(s => s.status === 'completed');
    
    // Get department-wise enrollment stats
    const departmentStats = {};
    for (const enrollment of enrolled) {
      const student = await Student.findById(enrollment.student).select('enrollment.department');
      if (student && student.enrollment?.department) {
        const dept = student.enrollment.department;
        departmentStats[dept] = (departmentStats[dept] || 0) + 1;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        classId: classId,
        className: classData.className,
        classCode: classData.classCode,
        capacity: classData.capacity,
        utilization: ((enrolled.length / classData.capacity) * 100).toFixed(2) + '%',
        counts: {
          enrolled: enrolled.length,
          dropped: dropped.length,
          completed: completed.length,
          totalEverEnrolled: classData.students.length
        },
        departmentBreakdown: departmentStats,
        enrollmentTrend: {
          // You can add historical trend data here
        }
      }
    });
    
  } catch (error) {
    console.error("Error getting enrollment stats:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};