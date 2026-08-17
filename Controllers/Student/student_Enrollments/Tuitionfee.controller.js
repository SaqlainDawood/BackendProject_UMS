import TuitionFee from "../../../Models/TuitionFee.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/DegreeClass.js";
import Shift from "../../../Models/Shift.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") return `Invalid ${err.path} — please provide a valid ID`;
  if (err.code === 11000) return "Tuition fee already set for this department, class and shift";
  if (err.name === "ValidationError") return Object.values(err.errors).map((e) => e.message).join(", ");
  return err.message || "Something went wrong, please try again";
}

// CREATE
export const createTuitionFee = async (req, res) => {
  try {
    const { departmentId, degreeClassId, shiftId, amount } = req.body;

    const [dept, degreeClass, shift] = await Promise.all([
      Department.findById(departmentId),
      DegreeClass.findById(degreeClassId),
      Shift.findById(shiftId),
    ]);
    if (!dept) return res.status(400).json({ success: false, message: "Invalid departmentId" });
    if (!degreeClass) return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
    if (!shift) return res.status(400).json({ success: false, message: "Invalid shiftId" });

    if (degreeClass.departmentId.toString() !== departmentId) {
      return res.status(400).json({ success: false, message: "This class does not belong to the selected department" });
    }
    if (shift.degreeClassId.toString() !== degreeClassId) {
      return res.status(400).json({ success: false, message: "This shift does not belong to the selected class" });
    }

    const fee = await TuitionFee.create({ departmentId, degreeClassId, shiftId, amount });
    res.status(201).json({ success: true, data: fee });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - all
export const getTuitionFees = async (req, res) => {
  try {
    const { departmentId, degreeClassId, shiftId } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (degreeClassId) filter.degreeClassId = degreeClassId;
    if (shiftId) filter.shiftId = shiftId;

    const fees = await TuitionFee.find(filter)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code")
      .populate("shiftId", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: fees });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - single
export const getTuitionFeeById = async (req, res) => {
  try {
    const fee = await TuitionFee.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code")
      .populate("shiftId", "name");
    if (!fee) return res.status(404).json({ success: false, message: "Tuition fee not found" });
    res.json({ success: true, data: fee });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// UPDATE
export const updateTuitionFee = async (req, res) => {
  try {
    const fee = await TuitionFee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!fee) return res.status(404).json({ success: false, message: "Tuition fee not found" });
    res.json({ success: true, data: fee });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// DELETE
export const deleteTuitionFee = async (req, res) => {
  try {
    const fee = await TuitionFee.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ success: false, message: "Tuition fee not found" });
    res.json({ success: true, message: "Tuition fee deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};