import Department from "../../../Models/Department.js";
import Campus from "../../../Models/Campus.js";

// CREATE
export const createDepartment = async (req, res) => {
  try {
    const { campusId } = req.body;

    if (!campusId) {
      return res.status(400).json({ success: false, message: "campusId is required" });
    }

    const campus = await Campus.findById(campusId);
    if (!campus) {
      return res.status(400).json({ success: false, message: "Invalid campusId" });
    }

    const department = await Department.create(req.body);
    const populated = await department.populate("campusId", "name code");

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This department (name/code) already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// READ - all (optionally filtered by campus, e.g. GET /departments?campusId=xxx)
export const getDepartments = async (req, res) => {
  try {
    const { campusId } = req.query;
    const filter = {};
    if (campusId) {
      filter.campusId = campusId;
    }

    const departments = await Department.find(filter)
      .populate("campusId", "name code")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - single
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate("campusId", "name code");
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: department });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateDepartment = async (req, res) => {
  try {
    if (req.body.campusId) {
      const campus = await Campus.findById(req.body.campusId);
      if (!campus) {
        return res.status(400).json({ success: false, message: "Invalid campusId" });
      }
    }

    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("campusId", "name code");
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, data: department });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This department (name/code) already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    res.json({ success: true, message: "Department deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};