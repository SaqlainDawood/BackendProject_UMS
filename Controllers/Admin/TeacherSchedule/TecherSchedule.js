// controllers/classController.js
import mongoose from 'mongoose';
import Class from '../../../Models/CreateClass.js';
import Teacher from '../../../Models/TeacherModel.js'; // Make sure this is imported!

export const getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    console.log("Fetching schedule for teacher:", teacherId); // Add debug log

    // Validate teacher ID
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher ID format"
      });
    }

    // First check if teacher exists
    const teacherExists = await Teacher.findById(teacherId);
    if (!teacherExists) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    // Find all classes where this teacher is assigned
    const teacherClasses = await Class.find({
      'teachers.teacher': teacherId,
      isActive: true
    }).select('className classCode department section schedule subject teachers');

    console.log("Found classes:", teacherClasses.length); // Debug log

    // Format the classes for response
    const assignedClasses = [];
    
    teacherClasses.forEach(classItem => {
      if (classItem.schedule && classItem.schedule.length > 0) {
        classItem.schedule.forEach(scheduleItem => {
          assignedClasses.push({
            classCode: classItem.classCode,
            className: classItem.className,
            day: scheduleItem.day,
            startTime: scheduleItem.startTime,
            endTime: scheduleItem.endTime,
            subject: classItem.subject,
            room: scheduleItem.room,
            section: classItem.section,
            department: classItem.department
          });
        });
      }
    });

    // Send response
    return res.status(200).json({
      success: true,
      teacherId: teacherId,
      teacherName: teacherExists.name,
      department: teacherExists.department,
      assignedClasses: assignedClasses
    });

  } catch (error) {
    console.log("ERROR in getTeacherSchedule:", error);
    console.log("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};