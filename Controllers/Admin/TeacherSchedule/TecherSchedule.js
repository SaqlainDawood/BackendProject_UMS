import mongoose from "mongoose";
import Class from "../../../Models/CreateClass.js";
import Teacher from '../../../Models/TeacherModel.js'
// Backend controller
export const getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // ... your existing code to fetch data ...
    
    // Get teacher details
    const teacherInfo = await Teacher.findById(teacherId);
    
    const formattedSchedule = {
      teacherId,
      teacherName: teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : "Unknown",
      department: teacherInfo?.department || "Unknown",
      assignedClasses: teacherClasses.flatMap(classItem => 
        classItem.schedule.map(scheduleItem => ({
          classId: classItem._id,
          classCode: classItem.classCode,
          className: classItem.className,
          day: scheduleItem.day,
          startTime: scheduleItem.startTime,
          endTime: scheduleItem.endTime,
          subject: classItem.subject,
          room: scheduleItem.room,
          section: classItem.section,
          semester: classItem.semester,
          department: classItem.department
        }))
      )
    };

    // Send response WITHOUT extra nesting
    return res.status(200).json({
      success: true,
      message: "Teacher schedule fetched successfully",
      ...formattedSchedule  // Spread the data directly
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
