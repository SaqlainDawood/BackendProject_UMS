import Subject from "../../../Models/Subject.js";
export const createSubject = async (req, res) => {
  try {
    const { departmentId, code, name, creditHours, description, prerequisites } = req.body;
    if (!departmentId || !code || !name || !creditHours) {
      return res.status(400).json({
        success: false,
        message: "departmentId, code, name aur creditHours required hain",
      });
    }
    const subject = await Subject.create({
      departmentId,
      code,
      name,
      creditHours,
      description,
      prerequisites,
    });
    return res.status(201).json({ success: true, data: subject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ye subject code is department mein pehle se maujood hai",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getAllSubjects = async (req, res) => {
  try {
    const { departmentId, isActive } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const subjects = await Subject.find(filter)
      .populate("departmentId", "name code")
      .populate("prerequisites.subjectId", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("prerequisites.subjectId", "name code");

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject nahi mila" });
    }
    return res.status(200).json({ success: true, data: subject });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject nahi mila" });
    }
    return res.status(200).json({ success: true, data: subject });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
export const deactivateSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject nahi mila" });
    }
    return res.status(200).json({ success: true, message: "Subject deactivate ho gaya" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};