import CreateClass from "../Models/CreateClass.js";

export const checkTeacherSchedule = async (req, res, next) => {
  try {
    const { teachers, schedule } = req.body;
    if (!teachers || teachers.length === 0 || !schedule || schedule.length === 0) {
      return next();
    }
    for (const teacher of teachers) {
      for (const sch of schedule) {
        const conflict = await CreateClass.findOne({
          "teachers.teacher": teacher.teacher,
          "schedule": {
            $elemMatch: {
              day: sch.day,
              startTime: sch.startTime,
              endTime: sch.endTime
            }
          },
          isActive: true  
        });

        if (conflict) {
          return res.status(400).json({
            success: false,
            message: `Teacher ${teacher.teacher} already has a class scheduled on ${sch.day} at ${sch.startTime}-${sch.endTime}`
          });
        }
      }
    }

    next();
  } catch (error) {
    console.log("Teacher Schedule Conflict Error", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};