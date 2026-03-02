import mongoose from "mongoose";
import Class from "../../../Models/CreateClass.js";
import Teacher from "../../../Models/TeacherModel.js";
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
      teacherId,
      assignedClasses,
    });
  } catch (error) {
    console.log("Error fetching teacher schedule", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
