import DegreeClass from "../../../Models/Degreeclass.js";
import Department from "../../../Models/Department.js";

// CREATE
export const createDegreeClass = async (req, res) => {
  try {
    const { name, code, departmentId, duration } = req.body;

    const departmentExists = await Department.findById(departmentId);
    if (!departmentExists) {
      return res.status(400).json({ success: false, message: "Invalid departmentId" });
    }

    const degreeClass = await DegreeClass.create({ name, code, departmentId, duration });
    res.status(201).json({ success: true, data: degreeClass });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This code already exists under this department" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// READ - all (optional filter by department)
export const getDegreeClasses = async (req, res) => {
  try {
    const { departmentId } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;

    const degreeClasses = await DegreeClass.find(filter)
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: degreeClasses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - single
export const getDegreeClassById = async (req, res) => {
  try {
    const degreeClass = await DegreeClass.findById(req.params.id).populate("departmentId", "name code");
    if (!degreeClass) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    res.json({ success: true, data: degreeClass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateDegreeClass = async (req, res) => {
  try {
    const { departmentId } = req.body;

    if (departmentId) {
      const departmentExists = await Department.findById(departmentId);
      if (!departmentExists) {
        return res.status(400).json({ success: false, message: "Invalid departmentId" });
      }
    }

    const degreeClass = await DegreeClass.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!degreeClass) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    res.json({ success: true, data: degreeClass });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This code already exists under this department" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteDegreeClass = async (req, res) => {
  try {
    const degreeClass = await DegreeClass.findByIdAndDelete(req.params.id);
    if (!degreeClass) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }
    res.json({ success: true, message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};