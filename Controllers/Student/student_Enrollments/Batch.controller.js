import Batch from "../../../Models/Batch.js";
import BatchSemesterLog from "../../../Models/BatchSemesterLog.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/DegreeClass.js";
import Shift from "../../../Models/Shift.js";
import Session from "../../../Models/Session.js";

// Mongoose ke raw errors ko clean, readable message mein badalta hai
function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }
  if (err.code === 11000) {
    return "A batch already exists for this department, class, shift and starting session";
  }
  if (err.name === "ValidationError") {
    return Object.values(err.errors).map((e) => e.message).join(", ");
  }
  return err.message || "Something went wrong, please try again";
}

// CREATE
export const createBatch = async (req, res) => {
  try {
    const { departmentId, degreeClassId, shiftId, startSessionId, totalSemesters } = req.body;

    const [dept, degreeClass, shift, session] = await Promise.all([
      Department.findById(departmentId),
      DegreeClass.findById(degreeClassId),
      Shift.findById(shiftId),
      Session.findById(startSessionId),
    ]);

    if (!dept) return res.status(400).json({ success: false, message: "Invalid departmentId" });
    if (!degreeClass) return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
    if (!shift) return res.status(400).json({ success: false, message: "Invalid shiftId" });
    if (!session) return res.status(400).json({ success: false, message: "Invalid startSessionId" });

    // Hierarchy check — DegreeClass isi Department ke andar honi chahiye
    if (degreeClass.departmentId.toString() !== departmentId) {
      return res.status(400).json({
        success: false,
        message: "This class does not belong to the selected department",
      });
    }

    // Hierarchy check — Shift isi DegreeClass ke andar honi chahiye
    if (shift.degreeClassId.toString() !== degreeClassId) {
      return res.status(400).json({
        success: false,
        message: "This shift does not belong to the selected class",
      });
    }

    const batch = await Batch.create({
      departmentId,
      degreeClassId,
      shiftId,
      startSessionId,
      totalSemesters,
      currentSemester: 1,
    });

    // pehla log entry — batch shuru hote hi semester 1 ka record
    await BatchSemesterLog.create({
      batchId: batch._id,
      sessionId: startSessionId,
      semester: 1,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - all (filters)
export const getBatches = async (req, res) => {
  try {
    const { departmentId, degreeClassId, shiftId, status } = req.query;
    const filter = {};
    if (departmentId) filter.departmentId = departmentId;
    if (degreeClassId) filter.degreeClassId = degreeClassId;
    if (shiftId) filter.shiftId = shiftId;
    if (status) filter.status = status;

    const batches = await Batch.find(filter)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code")
      .populate("shiftId", "name")
      .populate("startSessionId", "name term year")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: batches });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - single
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code")
      .populate("shiftId", "name")
      .populate("startSessionId", "name term year");

    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - semester breakdown (completed / current / pending)
export const getBatchSemesters = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    const completed = [];
    for (let i = 1; i < batch.currentSemester; i++) completed.push(i);

    const pending = [];
    for (let i = batch.currentSemester + 1; i <= batch.totalSemesters; i++) pending.push(i);

    const logs = await BatchSemesterLog.find({ batchId: batch._id })
      .populate("sessionId", "name term year")
      .sort({ semester: 1 });

    res.json({
      success: true,
      data: {
        completed,
        current: batch.status === "completed" ? null : batch.currentSemester,
        pending,
        status: batch.status,
        history: logs,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// ADVANCE SEMESTER
export const advanceBatch = async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required" });
    }

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(400).json({ success: false, message: "Invalid sessionId" });
    }

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }

    if (batch.status === "completed") {
      return res.status(400).json({ success: false, message: "This batch has already completed all semesters" });
    }

    if (batch.currentSemester >= batch.totalSemesters) {
      batch.status = "completed";
      await batch.save();
      return res.json({ success: true, message: "Batch marked as completed", data: batch });
    }

    batch.currentSemester += 1;
    if (batch.currentSemester === batch.totalSemesters) {
      // last semester shuru hua — abhi bhi "ongoing" rahega jab tak explicitly complete na ho
    }
    await batch.save();

    // duplicate log na bane isliye upsert
    await BatchSemesterLog.findOneAndUpdate(
      { batchId: batch._id, sessionId },
      { semester: batch.currentSemester },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Batch advanced to semester ${batch.currentSemester}`,
      data: batch,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// UPDATE (manual correction, agar zaroorat pade)
export const updateBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    res.json({ success: true, data: batch });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// DELETE
export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    await BatchSemesterLog.deleteMany({ batchId: batch._id });
    res.json({ success: true, message: "Batch deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};