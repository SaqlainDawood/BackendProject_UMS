import Teacher from "../../../Models/Teacher.js";

export const createTeacher = async (req, res) => {
  try {
    const { userId, departmentId, designation, specialization, joiningDate } = req.body;

    if (!userId || !departmentId) {
      return res.status(400).json({
        success: false,
        message: "userId aur departmentId required hain",
      });
    }

    const teacher = await Teacher.create({
      userId,
      departmentId,
      designation,
      specialization,
      joiningDate,
    });

    return res.status(201).json({ success: true, data: teacher });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ye user pehle se hi teacher hai",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTeachers = async (req, res) => {
  try {
    const { departmentId, isActive } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const teachers = await Teacher.find(filter)
      .populate("userId", "name email")
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: teachers.length, data: teachers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id)
      .populate("userId", "name email")
      .populate("departmentId", "name code");

    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }
    return res.status(200).json({ success: true, data: teacher });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }
    return res.status(200).json({ success: true, data: teacher });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const deactivateTeacher = async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher nahi mila" });
    }
    return res.status(200).json({ success: true, message: "Teacher deactivate ho gaya" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};