import Subject from "../../../Models/Subject.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/Degreeclass.js";

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }
  if (err.code === 11000) {
    return "This subject code already exists for this degree class and semester";
  }
  if (err.name === "ValidationError") {
    return Object.values(err.errors).map((e) => e.message).join(", ");
  }
  return err.message || "Something went wrong, please try again";
}

/* =========================================================
   CREATE SUBJECT
========================================================= */

export const createSubject = async (req, res) => {
  try {
    const { name, code, departmentId, degreeClassId, semester, creditHours, shift } = req.body;

    if (!name || !code || !departmentId || !degreeClassId || !semester || !shift) {
      return res.status(400).json({
        success: false,
        message: "name, code, departmentId, degreeClassId, semester and shift are required",
      });
    }

    if (!["Morning", "Evening", "Both"].includes(shift)) {
      return res.status(400).json({
        success: false,
        message: "shift must be one of: Morning, Evening, Both",
      });
    }

    const [department, degreeClass] = await Promise.all([
      Department.findById(departmentId),
      DegreeClass.findById(degreeClassId),
    ]);

    if (!department) {
      return res.status(400).json({ success: false, message: "Invalid departmentId" });
    }
    if (!degreeClass) {
      return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
    }

    // Degree Class -> Department hierarchy check (same pattern as Batch API)
    const classDepartmentId = degreeClass.departmentId?._id || degreeClass.departmentId;
    if (String(classDepartmentId) !== String(departmentId)) {
      return res.status(400).json({
        success: false,
        message: "This degree class does not belong to the selected department",
      });
    }

    // Semester must be within the degree class's total semesters (duration * 2)
    if (degreeClass.duration) {
      const totalSemesters = degreeClass.duration * 2;
      if (semester > totalSemesters) {
        return res.status(400).json({
          success: false,
          message: `This degree class only has ${totalSemesters} semesters`,
        });
      }
    }

    const subject = await Subject.create({
      name,
      code,
      departmentId,
      degreeClassId,
      semester,
      creditHours,
      shift,
    });

    const populated = await Subject.findById(subject._id)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code");

    return res.status(201).json({
      success: true,
      message: "Subject created successfully",
      data: populated,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   GET ALL SUBJECTS
   ?departmentId=&degreeClassId=&semester=&shift=
========================================================= */

export const getSubjects = async (req, res) => {
  try {
    const { departmentId, degreeClassId, semester, shift, isActive } = req.query;
    const filter = {};

    if (departmentId) filter.departmentId = departmentId;
    if (degreeClassId) filter.degreeClassId = degreeClassId;
    if (semester) filter.semester = Number(semester);
    if (isActive !== undefined) filter.isActive = isActive === "true";

    // "Both" shift subjects should show up whether the caller asks for
    // Morning or Evening — they apply to every shift of the class.
    if (shift) {
      filter.$or = [{ shift }, { shift: "Both" }];
    }

    const subjects = await Subject.find(filter)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code")
      .sort({ semester: 1, name: 1 });

    return res.json({ success: true, data: subjects });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   GET SINGLE SUBJECT
========================================================= */

export const getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code");

    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    return res.json({ success: true, data: subject });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   UPDATE SUBJECT
========================================================= */

export const updateSubject = async (req, res) => {
  try {
    const { name, code, creditHours, shift, semester, isActive } = req.body;

    if (shift && !["Morning", "Evening", "Both"].includes(shift)) {
      return res.status(400).json({
        success: false,
        message: "shift must be one of: Morning, Evening, Both",
      });
    }

    // departmentId / degreeClassId are intentionally NOT updatable here —
    // if the subject genuinely belongs elsewhere, create a new one instead
    // (same philosophy as Batch: identity fields don't get silently swapped).
    const updateData = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (creditHours) updateData.creditHours = creditHours;
    if (shift) updateData.shift = shift;
    if (semester) updateData.semester = semester;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await Subject.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("departmentId", "name code")
      .populate("degreeClassId", "name code");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }

    return res.json({ success: true, message: "Subject updated successfully", data: updated });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

/* =========================================================
   DELETE SUBJECT
========================================================= */

export const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: "Subject not found" });
    }
    return res.json({ success: true, message: "Subject deleted successfully" });
  } catch (err) {
    return res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};