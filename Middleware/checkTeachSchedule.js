import CreateClass from "../Models/CreateClass.js";

export const checkTeacherSchedule = async(req,res,next)=>{
    try {
        const {teacherId , day , startTime} = req.body;
        const conflict = await CreateClass.findOne({
            "teachers.teacher":teacherId,
            "schedule.day":day,
            "schedule.startTime":startTime
        })
        if(conflict){
            return res.status(400).json({
                success:false,
                message:"Teacher already has class at this Time!!!!"
            })
        }
        next();
    } catch (error) {
        console.log("Teacher Schedule Conflict Error",error);
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
}