import mongoose from "mongoose";
import Class from "../../../Models/CreateClass.js";

export const getTeacherSchedule = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Teacher ID",
      });
    }
    const classes = await Class.find({
      "teachers.teacher": teacherId,
      isActive: true,
    }).select("classCode subject schedule");
    if (!classes || classes.length === 0) {
      return res.status(200).json({
        success: true,
        teacherId,
        assignedClasses: [],
      });
    }
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
    const assignedClasses = [];

    classes.forEach((cls) => {
      cls.schedule.forEach((sch) => {
        assignedClasses.push({
          classCode: cls.classCode,
          subject: cls.subject,
          day: sch.day,
          startTime: sch.startTime,
          endTime: sch.endTime,
          room: sch.room,
        });
      });
    });
     return res.status(200).json({
      success: true,
      message: "Teacher schedule fetched successfully",
      ...formattedSchedule  // Spread the data directly
    });
  } catch (error) {
    console.log("Error fetching teacher schedule", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
