import mongoose from "mongoose";
import Enrollment from "../../../Models/Enrollment.js";
import Student from "../../../Models/StudentModel.js";
import Batch from "../../../Models/Batch.js";
import Subject from "../../../Models/Subject.js";

const normalizePrereqSubjects = (subject) => {
  if (!subject) return [];

  const prereqList = Array.isArray(subject.prerequisites)
    ? subject.prerequisites
    : [];

  return prereqList
    .map((item) => (typeof item === "string" ? item : item?.subjectId || item?._id))
    .filter(Boolean)
    .map((id) => String(id));
};

const getStudentSubjectStatus = async (studentId, subjectId) => {
  const resultModels = [
    mongoose.models.Result,
    mongoose.models.Marks,
    mongoose.models.Mark,
    mongoose.models.StudentResult,
    mongoose.models.StudentMarks,
  ].filter(Boolean);

  for (const model of resultModels) {
    const doc = await model
      .findOne({
        studentId,
        $or: [
          { subjectId },
          { subject: subjectId },
          { courseId: subjectId },
          { subjectCode: subjectId },
        ],
      })
      .lean();

    if (!doc) continue;

    const rawStatus =
      doc.resultStatus ||
      doc.status ||
      doc.passStatus ||
      doc.gradeStatus ||
      doc.finalStatus ||
      "pending";

    const normalized = String(rawStatus).toLowerCase();

    if (["passed", "pass", "p", "clear", "approved"].includes(normalized)) {
      return "passed";
    }

    if (["failed", "fail", "f", "reappear", "not passed", "not_passed"].includes(normalized)) {
      return "failed";
    }
  }

  return "pending";
};

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }
  if (err.code === 11000) {
    return "This student is already enrolled in this batch";
  }
  if (err.name === "ValidationError") {
    return Object.values(err.errors).map((e) => e.message).join(", ");
  }
  return err.message || "Something went wrong, please try again";
}

// helper - enrollment ko batch ki live details (department, class, shift, currentSemester) ke sath attach karta hai
function attachBatchInfo(enrollmentDoc) {
  const enrollment = enrollmentDoc.toObject();
  const batch = enrollment.batchId;
  return {
    ...enrollment,
    currentSemester: batch?.currentSemester ?? null,
    totalSemesters: batch?.totalSemesters ?? null,
    batchStatus: batch?.status ?? null,
  };
}

// CREATE
export const createEnrollment = async (req, res) => {
  try {
    const { studentId, batchId, subjectId } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(400).json({ success: false, message: "Invalid studentId" });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(400).json({ success: false, message: "Invalid batchId" });
    }

    if (subjectId) {
      const subject = await Subject.findById(subjectId).populate("prerequisites.subjectId", "name");
      if (!subject) {
        return res.status(400).json({ success: false, message: "Invalid subjectId" });
      }

      const prereqIds = normalizePrereqSubjects(subject);
      for (const prereqId of prereqIds) {
        const prereqStatus = await getStudentSubjectStatus(studentId, prereqId);
        if (prereqStatus !== "passed") {
          const prereqSubject = await Subject.findById(prereqId).select("name");
          return res.status(400).json({
            success: false,
            message: `Cannot enroll in ${subject.name}: prerequisite ${prereqSubject?.name || "subject"} not passed.`,
          });
        }
      }
    }

    const enrollment = await Enrollment.create({ studentId, batchId });
    res.status(201).json({ success: true, data: enrollment });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - all (filters)
export const getEnrollments = async (req, res) => {
  try {
    const { studentId, batchId, status } = req.query;
    const filter = {};
    if (studentId) filter.studentId = studentId;
    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate("studentId", "firstName lastName cnic rollNo registrationNo")
      .populate({
        path: "batchId",
        populate: [
          { path: "departmentId", select: "name code" },
          { path: "degreeClassId", select: "name code" },
          { path: "shiftId", select: "name" },
        ],
      })
      .sort({ createdAt: -1 });

    const result = enrollments.map(attachBatchInfo);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// READ - single
export const getEnrollmentById = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("studentId", "firstName lastName cnic rollNo registrationNo")
      .populate({
        path: "batchId",
        populate: [
          { path: "departmentId", select: "name code" },
          { path: "degreeClassId", select: "name code" },
          { path: "shiftId", select: "name" },
        ],
      });

    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }
    res.json({ success: true, data: attachBatchInfo(enrollment) });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// UPDATE (status change - active/completed/dropped)
export const updateEnrollment = async (req, res) => {
  try {
    const { subjectId } = req.body;
    const existingEnrollment = await Enrollment.findById(req.params.id);

    if (!existingEnrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }

    if (subjectId) {
      const subject = await Subject.findById(subjectId).populate("prerequisites.subjectId", "name");
      if (!subject) {
        return res.status(400).json({ success: false, message: "Invalid subjectId" });
      }

      const prereqIds = normalizePrereqSubjects(subject);
      for (const prereqId of prereqIds) {
        const prereqStatus = await getStudentSubjectStatus(existingEnrollment.studentId, prereqId);
        if (prereqStatus !== "passed") {
          const prereqSubject = await Subject.findById(prereqId).select("name");
          return res.status(400).json({
            success: false,
            message: `Cannot enroll in ${subject.name}: prerequisite ${prereqSubject?.name || "subject"} not passed.`,
          });
        }
      }
    }

    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("studentId", "firstName lastName cnic rollNo registrationNo")
      .populate({
        path: "batchId",
        populate: [
          { path: "departmentId", select: "name code" },
          { path: "degreeClassId", select: "name code" },
          { path: "shiftId", select: "name" },
        ],
      });

    res.json({ success: true, data: attachBatchInfo(enrollment) });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// BULK CREATE — multiple students ek sath ek batch mein enroll karo
export const bulkCreateEnrollment = async (req, res) => {
  try {
    const { batchId, studentIds } = req.body;

    if (!batchId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "batchId and a non-empty studentIds array are required",
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(400).json({ success: false, message: "Invalid batchId" });
    }

    // pehle se enrolled students dhoondo (skip karne ke liye)
    const existing = await Enrollment.find({
      batchId,
      studentId: { $in: studentIds },
    }).select("studentId");
    const alreadyEnrolledIds = new Set(existing.map((e) => e.studentId.toString()));

    const results = {
      enrolled: [],
      alreadySkipped: [],
      invalidStudents: [],
    };

    const toInsert = [];

    for (const studentId of studentIds) {
      if (alreadyEnrolledIds.has(studentId)) {
        results.alreadySkipped.push(studentId);
        continue;
      }

      const student = await Student.findById(studentId);
      if (!student) {
        results.invalidStudents.push(studentId);
        continue;
      }

      toInsert.push({ studentId, batchId });
    }

    let inserted = [];
    if (toInsert.length > 0) {
      inserted = await Enrollment.insertMany(toInsert, { ordered: false });
      results.enrolled = inserted.map((e) => e.studentId.toString());
    }

    res.status(201).json({
      success: true,
      message: `${results.enrolled.length} students enrolled, ${results.alreadySkipped.length} already enrolled (skipped), ${results.invalidStudents.length} invalid`,
      data: results,
    });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};

// DELETE
export const deleteEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) {
      return res.status(404).json({ success: false, message: "Enrollment not found" });
    }
    res.json({ success: true, message: "Enrollment deleted" });
  } catch (err) {
    res.status(400).json({ success: false, message: cleanErrorMessage(err) });
  }
};