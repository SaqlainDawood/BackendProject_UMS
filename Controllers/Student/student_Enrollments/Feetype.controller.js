import FeeType from "../../../Models/FeeType.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") return `Invalid ${err.path} — please provide a valid ID`;
  if (err.code === 11000) return "This fee type already exists";
  if (err.name === "ValidationError") return Object.values(err.errors).map((e) => e.message).join(", ");
  return err.message || "Something went wrong, please try again";
}

export const createFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.create(req.body);
    res.status(201).json({ success: true, data: feeType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const getFeeTypes = async (req, res) => {
  try {
    const feeTypes = await FeeType.find().sort({ createdAt: -1 });
    res.json({ success: true, data: feeTypes });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const getFeeTypeById = async (req, res) => {
  try {
    const feeType = await FeeType.findById(req.params.id);
    if (!feeType) return res.status(404).json({ success: false, message: "Fee type not found" });
    res.json({ success: true, data: feeType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const updateFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!feeType) return res.status(404).json({ success: false, message: "Fee type not found" });
    res.json({ success: true, data: feeType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const deleteFeeType = async (req, res) => {
  try {
    const feeType = await FeeType.findByIdAndDelete(req.params.id);
    if (!feeType) return res.status(404).json({ success: false, message: "Fee type not found" });
    res.json({ success: true, message: "Fee type deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};