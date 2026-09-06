import Campus from "../../../Models/Campus.js";
import Department from "../../../Models/Department.js";

// CREATE
export const createCampus = async (req, res) => {
  try {
    const campus = await Campus.create(req.body);
    res.status(201).json({ success: true, data: campus });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This campus (name/code) already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// READ - all
export const getCampuses = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }
    const campuses = await Campus.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: campuses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - single
export const getCampusById = async (req, res) => {
  try {
    const campus = await Campus.findById(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: "Campus not found" });
    }
    res.json({ success: true, data: campus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateCampus = async (req, res) => {
  try {
    const campus = await Campus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!campus) {
      return res.status(404).json({ success: false, message: "Campus not found" });
    }
    res.json({ success: true, data: campus });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This campus (name/code) already exists" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteCampus = async (req, res) => {
  try {
    // Prevent deleting a campus that still has departments attached to it,
    // otherwise those departments would be left pointing at a dangling campusId.
    const departmentCount = await Department.countDocuments({ campusId: req.params.id });
    if (departmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete this campus — ${departmentCount} department(s) are still linked to it`,
      });
    }

    const campus = await Campus.findByIdAndDelete(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: "Campus not found" });
    }
    res.json({ success: true, message: "Campus deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};