import FineType from "../../../Models/FineType.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") return `Invalid ${err.path} — please provide a valid ID`;
  if (err.code === 11000) return "This fine type already exists";
  if (err.name === "ValidationError") return Object.values(err.errors).map((e) => e.message).join(", ");
  return err.message || "Something went wrong, please try again";
}

export const createFineType = async (req, res) => {
  try {
    const fineType = await FineType.create(req.body);
    res.status(201).json({ success: true, data: fineType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const getFineTypes = async (req, res) => {
  try {
    const fineTypes = await FineType.find().sort({ createdAt: -1 });
    res.json({ success: true, data: fineTypes });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const getFineTypeById = async (req, res) => {
  try {
    const fineType = await FineType.findById(req.params.id);
    if (!fineType) return res.status(404).json({ success: false, message: "Fine type not found" });
    res.json({ success: true, data: fineType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const updateFineType = async (req, res) => {
  try {
    const fineType = await FineType.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!fineType) return res.status(404).json({ success: false, message: "Fine type not found" });
    res.json({ success: true, data: fineType });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

export const deleteFineType = async (req, res) => {
  try {
    const fineType = await FineType.findByIdAndDelete(req.params.id);
    if (!fineType) return res.status(404).json({ success: false, message: "Fine type not found" });
    res.json({ success: true, message: "Fine type deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};