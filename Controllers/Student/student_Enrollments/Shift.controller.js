import Shift from "../../../Models/Shift.js";
import DegreeClass from "../../../Models/Degreeclass.js";

// CREATE
export const createShift = async (req, res) => {
  try {
    const { name, degreeClassId } = req.body;

    const degreeClassExists = await DegreeClass.findById(degreeClassId);
    if (!degreeClassExists) {
      return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
    }

    const shift = await Shift.create({ name, degreeClassId });
    res.status(201).json({ success: true, data: shift });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This shift already exists for this class" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// READ - all (optional filter by degreeClassId)
export const getShifts = async (req, res) => {
  try {
    const { degreeClassId } = req.query;
    const filter = {};
    if (degreeClassId) filter.degreeClassId = degreeClassId;

    const shifts = await Shift.find(filter)
      .populate("degreeClassId", "name code")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: shifts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// READ - single
export const getShiftById = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id).populate("degreeClassId", "name code");
    if (!shift) {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    res.json({ success: true, data: shift });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE
export const updateShift = async (req, res) => {
  try {
    const { degreeClassId } = req.body;

    if (degreeClassId) {
      const degreeClassExists = await DegreeClass.findById(degreeClassId);
      if (!degreeClassExists) {
        return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
      }
    }

    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    res.json({ success: true, data: shift });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: "This shift already exists for this class" });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE
export const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) {
      return res.status(404).json({ success: false, message: "Shift not found" });
    }
    res.json({ success: true, message: "Shift deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};