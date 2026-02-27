import Teacher from "../../../Models/TeacherModel.js";
import Class from "../../../Models/CreateClass.js";
import mongoose from 'mongoose'
export const createClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
 try{
    const {
      className,
      classCode,
      department,
      semester,
      section ,
      subject ,
      creditHours,
      teachers,
      capacity,
      schedule,
      students
    } = req.body;
    if(!className || !classCode || !department
       || !semester || !section ||!subject
        || !creditHours ||!teachers ||!schedule || !students){
      return res.status(400).json({
        success:false,
        message:"Missing Required Fields"
      })
    }
    if(semester < 1 || semester > 8){
      throw new Error("Semester must between 1 and 8");
    }
    if(capacity && (capacity < 1 || capacity > 70)){
      throw new Error("Capacity must between 1 and 70");
    }

      const existingClass = await Class.findOne({classCode}).session(session);
      if(existingClass){
         throw new Error("Class code already exists");
      }

      const validateTeachers = [];
      if(teachers && teachers.length > 0){
        const teacherId = new Set();
        for(let t of teachers){
          if(!mongoose.Types.ObjectId.isValid(t.teacher)){
            throw new Error(`Invalide Teacher ID :${t.teacher}`);
          }
          if(teacherId.has(t.teacher)){
            throw new Error("Duplicate teacher assign"); 
          }
          teacherId.add(t.teacher);
          const teacherExist = await Teacher.findById(t.teacher).session(session);
          if(!teacherExist){
            throw new Error(`Teacher not found${t.teacher}`);
          }
          validateTeachers.push({
            teacher:t.teacher,
            role:t.role
          })
        }
      }
      if(!schedule || schedule.length === 0){
        throw new Error("Schedule required");
        }
        for(let s of schedule){
          if( !s.day || !s.startTime || !s.endTime || !s.room){
              throw new Error("Please Enter completely Schedule Data");
          }
        }
        
      const newClassData = {
          className,
          classCode,
          semester,
          subject,
          department,
          section,
          creditHours,
          teachers:validateTeachers,
          capacity,
          schedule,
          students
      }
      const newClass = await Class.create([newClassData], {session});
      await session.commitTransaction();
      session.endSession();
      const populatedClass = await Class.findById(newClass[0]._id)
      .populate('teachers.teacher', 'firstName lastName email employeeID')
      .populate('students.student', 'firstName lastName rollNo registrationNo');
      return res.status(201).json({
          success:true,
          message:"Class Created Successfully",
          data:newClass[0]
      })
     
 } catch (error) {
  console.log("Error for creating class",error);
  await session.abortTransaction();
  session.endSession();
   res.status(500).json({
      success: false,
      message:error.message
    });
  }
};

export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find({ isActive: true })
      .populate("teachers", "name email")
      .populate("students", "name rollNo");
    console.log("Data = ", classes);
    res.status(201).json({
      success: true,
      message: "Fetch All classes Successfully",
      data: classes,
    });
  } catch (error) {
    console.log("Error Fetching all classes", error);
    res.status(500).json({
      success: false,
      message: "Server Error for fetching all classes" || error.message,
    });
  }
};

export const getSingleClass = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Get Single Class", id);
    const singleClass = await Class.findById(id)
      .populate("teacher")
      .populate("students");
    if (!singleClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }
    res.status(201).json({
      success: true,
      message: "Class find successfully",
      data: singleClass,
    });
  } catch (error) {
    console.log("Error for fetching the single class", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedClass = await Class.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    res.status(200).json({
      success: true,
      message: "Class updated",
      data: updatedClass,
    });
  } catch (error) {
    console.log("Server Error for update class", error);
    res.status(500).json({
      success: false,
      message: "Server Error for update the Class" || error.message,
    });
  }
};
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("ID = ", id);
    await Class.findByIdAndUpdate(id, { isActive: false });
    res.status(200).json({
      success: true,
      message: "Class Delete Successfully",
    });
  } catch (error) {
    console.log("Server Error Delete the class", error);
    res.status(500).json({
      success: false,
      message: "Server Error" || error.message,
    });
  }
};
