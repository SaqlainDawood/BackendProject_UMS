import Teacher from '../../../Models/TeacherModel.js'
import Class from '../../../Models/CreateClass.js';
export const createClass = async(req,res)=>{
    try {
        const {className , semester , department , teacher , student } = req.body;
        const existTeacher = await Teacher.findById(teacher);
        if(!existTeacher){
            return res.status(404).json({
                success:false,
                message:"Teacher Not Found!!!",
            })
        }
        const newClass = await Class.create({
            className , semester , department , teacher , student,
        })
         res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: newClass,
    });
        
    } catch (error) {
        console.log("Error For creating Class",error);
         res.status(500).json({
      success: false,
      message: "Class creation failed",
      error: error.message,
    });
        
    }
}