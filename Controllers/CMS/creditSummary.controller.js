import mongoose from "mongoose";
import DegreeClass from "../../Models/Degreeclass.js";
import ProgramSemester from "../../Models/Programsemester.js";
import SemesterSubject from "../../Models/Semestersubject.js";
import Subject from "../../Models/Subject.js";

const toStringId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const normalizeStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (["passed", "pass", "p", "clear", "approved"].includes(normalized)) {
    return "passed";
  }

  if (["failed", "fail", "f", "reappear", "not passed", "not_passed"].includes(normalized)) {
    return "failed";
  }

  return "pending";
};

const getResultModels = () =>
  [
    mongoose.models.Result,
    mongoose.models.Marks,
    mongoose.models.Mark,
    mongoose.models.StudentResult,
    mongoose.models.StudentMarks,
  ].filter(Boolean);

const getSubjectResultMap = async (studentId, subjectIds) => {
  const ids = [...new Set((subjectIds || []).filter(Boolean).map(String))];
  const map = new Map();

  if (!studentId || !ids.length) return map;

  for (const model of getResultModels()) {
    const resultDocs = await model
      .find({
        studentId,
        $or: [
          { subjectId: { $in: ids } },
          { subject: { $in: ids } },
          { courseId: { $in: ids } },
          { subjectCode: { $in: ids } },
        ],
      })
      .lean();

    if (!resultDocs?.length) continue;

    for (const doc of resultDocs) {
      const candidateId =
        toStringId(doc.subjectId) ||
        toStringId(doc.subject) ||
        toStringId(doc.courseId) ||
        toStringId(doc.subjectCode);

      if (!candidateId) continue;

      const status = normalizeStatus(
        doc.resultStatus ||
          doc.status ||
          doc.passStatus ||
          doc.gradeStatus ||
          doc.finalStatus ||
          doc.result ||
          "pending"
      );

      map.set(candidateId, status);
    }
  }

  return map;
};

export const getClassCreditSummary = async (req, res) => {
  try {
    const { classId } = req.params;
    const degreeClass = await DegreeClass.findById(classId);

    if (!degreeClass) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    const semesters = await ProgramSemester.find({
      degreeClassId: classId,
      isActive: { $ne: false },
    }).sort({ semesterNo: 1 });

    let assignedCreditHours = 0;
    const semesterSummaries = [];

    for (const semester of semesters) {
      const semesterSubjects = await SemesterSubject.find({
        programSemesterId: semester._id,
        isActive: { $ne: false },
      }).populate("subjectId", "name code creditHours");

      const assigned = semesterSubjects.reduce((sum, item) => sum + Number(item.creditHours || 0), 0);
      assignedCreditHours += assigned;

      semesterSummaries.push({
        semesterId: semester._id,
        semesterNumber: semester.semesterNo,
        assignedCreditHours: assigned,
        subjectCount: semesterSubjects.length,
      });
    }

    const totalCreditHours = Number(degreeClass.totalCreditHours || 0);

    return res.json({
      success: true,
      classId,
      totalCreditHours,
      assignedCreditHours,
      pendingCreditHours: Math.max(totalCreditHours - assignedCreditHours, 0),
      semesters: semesterSummaries,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSemesterCreditSummary = async (req, res) => {
  try {
    const { semesterId } = req.params;

    const semester = await ProgramSemester.findById(semesterId);
    if (!semester) {
      return res.status(404).json({ success: false, message: "Semester not found" });
    }

    const semesterSubjects = await SemesterSubject.find({
      programSemesterId: semesterId,
      isActive: { $ne: false },
    }).populate("subjectId", "name code creditHours");

    const subjects = semesterSubjects.map((item) => ({
      subjectId: item.subjectId?._id,
      name: item.subjectId?.name || "Unknown subject",
      code: item.subjectId?.code || "",
      creditHours: Number(item.creditHours || item.subjectId?.creditHours || 0),
    }));

    return res.json({
      success: true,
      semesterId,
      assignedCreditHours: subjects.reduce((sum, item) => sum + Number(item.creditHours || 0), 0),
      subjects,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentCreditSummary = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await mongoose.models.Student?.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const classIds = await DegreeClass.find({}).select("_id totalCreditHours");
    const degreeClassId = student.degreeClassId || student.degreeClass?.toString?.() || null;
    const degreeClass = degreeClassId
      ? await DegreeClass.findById(degreeClassId)
      : null;

    const classTotalCreditHours = Number(degreeClass?.totalCreditHours || 0);

    const programSemesters = degreeClassId
      ? await ProgramSemester.find({ degreeClassId: degreeClassId, isActive: { $ne: false } }).sort({ semesterNo: 1 })
      : [];

    const allSemesterSubjectRows = [];
    for (const semester of programSemesters) {
      const rows = await SemesterSubject.find({
        programSemesterId: semester._id,
        isActive: { $ne: false },
      }).populate("subjectId", "name code creditHours prerequisites");
      allSemesterSubjectRows.push(...rows);
    }

    const subjectMap = new Map();
    const subjectResultMap = new Map();
    const subjectIds = allSemesterSubjectRows
      .map((row) => toStringId(row.subjectId?._id || row.subjectId))
      .filter(Boolean);

    const resultMap = await getSubjectResultMap(studentId, subjectIds);

    let passedCreditHours = 0;
    let failedCreditHours = 0;
    const renderedSubjects = [];
    const semesterBreakdown = [];

    for (const semester of programSemesters) {
      const rows = await SemesterSubject.find({
        programSemesterId: semester._id,
        isActive: { $ne: false },
      }).populate("subjectId", "name code creditHours prerequisites");

      let semesterPassed = 0;
      let semesterFailed = 0;
      let semesterPending = 0;

      for (const row of rows) {
        const subjectDoc = row.subjectId;
        const subjectId = toStringId(subjectDoc?._id);
        const creditHours = Number(subjectDoc?.creditHours || row.creditHours || 0);
        const prerequisiteIds = (subjectDoc?.prerequisites || [])
          .map((item) => toStringId(item?.subjectId || item?._id || item))
          .filter(Boolean);

        subjectMap.set(subjectId, subjectDoc);

        let status = resultMap.get(subjectId) || "pending";
        let blockedBy = null;

        if (prerequisiteIds.length) {
          const missingPrereq = prerequisiteIds.find((prereqId) => {
            const prereqStatus = resultMap.get(prereqId) || "pending";
            return prereqStatus !== "passed";
          });

          if (missingPrereq) {
            const prereqSubject = await Subject.findById(missingPrereq).select("name");
            status = "blocked";
            blockedBy = prereqSubject?.name || "prerequisite subject";
          }
        }

        if (status === "passed") {
          passedCreditHours += creditHours;
          semesterPassed += creditHours;
        } else if (status === "failed") {
          failedCreditHours += creditHours;
          semesterFailed += creditHours;
        } else {
          semesterPending += creditHours;
        }

        renderedSubjects.push({
          subjectId,
          name: subjectDoc?.name || "Unknown subject",
          creditHours,
          status,
          blockedBy,
        });
      }

      semesterBreakdown.push({
        semesterId: semester._id,
        semesterNumber: semester.semesterNo,
        passedCreditHours: semesterPassed,
        failedCreditHours: semesterFailed,
        pendingCreditHours: semesterPending,
      });
    }

    const pendingCreditHours = Math.max(classTotalCreditHours - passedCreditHours, 0);

    return res.json({
      success: true,
      studentId,
      classTotalCreditHours: classTotalCreditHours,
      passedCreditHours,
      failedCreditHours,
      pendingCreditHours,
      semesters: semesterBreakdown,
      subjects: renderedSubjects,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
