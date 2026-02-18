import Teacher from "../../../Models/TeacherModel.js";
import Class from "../../../Models/CreateClass.js";
export const createClass = async (req, res) => {
  try {
    const { className, semester, department, teacher, students } = req.body;
    if (!className || !department || !semester || !teacher) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }
    const existTeacher = await Teacher.findById(teacher);
    if (!existTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher Not Found!!!",
      });
    }
    const newClass = await Class.create({
      className,
      semester,
      department,
      teacher,
      students,
    });
    console.log("Create New Class", newClass);

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      data: newClass,
    });
  } catch (error) {
    console.log("Error For creating Class", error);
    res.status(500).json({
      success: false,
      message: "Class creation failed",
      error: error.message,
    });
  }
};

export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find({ isActive: true })
      .populate("teacher", "name email")
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
