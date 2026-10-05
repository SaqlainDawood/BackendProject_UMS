import mongoose from "mongoose";
import Timetable from "../../Models/Timetable.js";
import Batch from "../../Models/Batch.js";
import ProgramSemester from "../../Models/Programsemester.js";
import SemesterSubject from "../../Models/Semestersubject.js";
import TeacherAssignment from "../../Models/Teacherassignment.js";
import Teacher from "../../Models/Teacher.js";
import Room from "../../Models/Room.js";
import TimeSlot from "../../Models/TimeSlot.js";
import Session from "../../Models/Session.js";
import SubjectTeacherDefault from "../../Models/SubjectTeacherDefault.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LECTURE_TYPES = ["theory", "practical"];

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const sendError = (res, error, fallback = "Something went wrong") => {
  let status = error.status || 500;
  let message = error.message || fallback;

  if (error.code === 11000) {
    // Race condition caught by the unique indexes
    status = 409;
    const kp = error.keyPattern || {};
    message = kp.roomId
      ? "Room is already occupied at this time."
      : kp.teacherId
      ? "Teacher already has a lecture scheduled at this time."
      : kp.batchId
      ? "Class already has a lecture scheduled at this time."
      : "This slot was just booked by another request. Please refresh and retry.";
  } else if (error.name === "CastError" || error.name === "ValidationError") {
    status = 400;
  }

  return res.status(status).json({ success: false, message });
};

const idOf = (value) => (value && value._id ? value._id : value);
const excludeSelf = (id) => (id ? { _id: { $ne: id } } : {});

const slotLabel = (day, period) => `${day} Period ${period}`;
const roomLabel = (room) => room?.name || room?.code || "Room";
const hasLimit = (v) => Number.isFinite(Number(v)) && Number(v) > 0;

// Class strength: adjust field names to match your Batch schema
const getBatchStrength = (batch) => {
  const n = Number(batch?.studentCount ?? batch?.totalStudents ?? batch?.strength);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Shared by manual create/update AND generation. Returns an error message or null.
const roomProblem = (room, type, batch) => {
  if (!room || room.isActive === false) return "Room not found or inactive.";
  if (type === "practical" && room.type !== "lab") {
    return "Practical lecture requires a lab room.";
  }
  const strength = getBatchStrength(batch);
  if (strength && hasLimit(room.capacity) && Number(room.capacity) < strength) {
    return `${roomLabel(room)} capacity (${room.capacity}) is less than class strength (${strength}).`;
  }
  return null;
};

// 2-3 credit => 2 theory | 4 credit => 2 theory + 2 practical
export const getLectureSplit = (semesterSubject) => {
  const credit = Number(
    semesterSubject?.subjectId?.creditHours ?? semesterSubject?.creditHours ?? 0
  );
  if (credit >= 4) return { theory: 2, practical: 2, total: 4 };
  if (credit >= 2) return { theory: 2, practical: 0, total: 2 };
  if (credit === 1) return { theory: 1, practical: 0, total: 1 };
  return { theory: 0, practical: 0, total: 0 };
};

const getWeekLectureRequirement = (semesterSubject) =>
  getLectureSplit(semesterSubject).total;

const populateEntry = (query) =>
  query
    .populate({
      path: "semesterSubjectId",
      populate: { path: "subjectId", select: "name code creditHours" },
    })
    .populate({
      path: "teacherAssignmentId",
      populate: {
        path: "teacherId",
        populate: { path: "userId", select: "name email" },
      },
    })
    .populate({ path: "teacherId", populate: { path: "userId", select: "name email" } })
    .populate({ path: "roomId", select: "name code type capacity" });

const buildSubjectSummary = (semesterSubject, timetableEntries, assignment) => {
  const subject = semesterSubject.subjectId || null;
  const split = getLectureSplit(semesterSubject);

  const planned = timetableEntries.filter(
    (e) => String(idOf(e.semesterSubjectId)) === String(semesterSubject._id)
  );
  const done = (type) => planned.filter((e) => (e.lectureType || "theory") === type).length;

  const scheduledLectures = planned.length;

  return {
    _id: semesterSubject._id,
    subjectId: subject?._id || semesterSubject.subjectId,
    subjectName: subject?.name || "Unknown Subject",
    subjectCode: subject?.code || "N/A",
    creditHours: subject?.creditHours || 0,
    subjectType: semesterSubject.subjectType || "COMPULSORY",
    requiredLectures: split.total,
    scheduledLectures,
    remainingLectures: Math.max(split.total - scheduledLectures, 0),
    theoryRemaining: Math.max(split.theory - done("theory"), 0),
    practicalRemaining: Math.max(split.practical - done("practical"), 0),
    isComplete: scheduledLectures >= split.total,
    teacherAssignmentId: assignment?._id || null,
    teacherId: idOf(assignment?.teacherId) || null,
    teacherName: assignment?.teacherId?.userId?.name || null,
  };
};

// Copies the remembered teacher (same class) to this batch/semester.
const autoAssignDefaultTeachers = async (batch, semesterNo, semesterSubjects) => {
  for (const ss of semesterSubjects) {
    const exists = await TeacherAssignment.findOne({
      batchId: batch._id,
      semesterNo,
      semesterSubjectId: ss._id,
      isActive: true,
    });
    if (exists) continue;

    const def = await SubjectTeacherDefault.findOne({
      degreeClassId: batch.degreeClassId,
      subjectId: idOf(ss.subjectId),
    });
    if (!def) continue;

    try {
      await TeacherAssignment.create({
        batchId: batch._id,
        semesterNo,
        semesterSubjectId: ss._id,
        teacherId: def.teacherId,
        isActive: true,
      });
    } catch (err) {
      if (err.code !== 11000) throw err; // already created by a parallel request
    }
  }
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const validateTimetablePayload = async ({
  batch,
  sessionId,
  semesterNo,
  semesterSubjectId,
  lectureType,
  roomId,
  day,
  periodNo,
  existingEntryId = null,
}) => {
  if (!batch) throw new AppError("Batch not found", 404);

  const resolvedSemester = Number(semesterNo ?? batch.currentSemester ?? 1);
  if (!Number.isInteger(resolvedSemester) || resolvedSemester < 1) {
    throw new AppError("Invalid semester number");
  }

  const selectedSessionId = sessionId || batch.startSessionId;
  if (!selectedSessionId) throw new AppError("Session is missing for the selected batch");

  const selectedSession = await Session.findById(selectedSessionId);
  if (!selectedSession) throw new AppError("Selected session is invalid");

  const programSemester = await ProgramSemester.findOne({
    degreeClassId: batch.degreeClassId,
    semesterNo: resolvedSemester,
    isActive: { $ne: false },
  });
  if (!programSemester) {
    throw new AppError(`No semester configuration found for Semester ${resolvedSemester}`);
  }

  if (!semesterSubjectId || !mongoose.Types.ObjectId.isValid(semesterSubjectId)) {
    throw new AppError("Valid semesterSubjectId is required");
  }

  const semesterSubject = await SemesterSubject.findById(semesterSubjectId).populate(
    "subjectId",
    "name code creditHours"
  );
  if (!semesterSubject) throw new AppError("Semester subject not found", 404);

  if (String(semesterSubject.programSemesterId) !== String(programSemester._id)) {
    throw new AppError("Selected subject does not belong to the selected batch semester.");
  }

  const type = lectureType || "theory";
  if (!LECTURE_TYPES.includes(type)) {
    throw new AppError("lectureType must be theory or practical");
  }

  // Teacher comes from the assignment only (never from the client)
  let teacherAssignment = await TeacherAssignment.findOne({
    batchId: batch._id,
    semesterNo: resolvedSemester,
    semesterSubjectId,
    isActive: true,
  });

  if (!teacherAssignment) {
    await autoAssignDefaultTeachers(batch, resolvedSemester, [semesterSubject]);
    teacherAssignment = await TeacherAssignment.findOne({
      batchId: batch._id,
      semesterNo: resolvedSemester,
      semesterSubjectId,
      isActive: true,
    });
  }
  if (!teacherAssignment) {
    throw new AppError("Pehle is subject ko teacher assign karein.");
  }

  const teacher = await Teacher.findById(teacherAssignment.teacherId).populate(
    "userId",
    "name email"
  );
  if (!teacher) throw new AppError("Assigned teacher not found", 404);

  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    throw new AppError("Valid roomId is required");
  }
  const room = await Room.findById(roomId);
  if (!room) throw new AppError("Room not found", 404);

  const roomIssue = roomProblem(room, type, batch);
  if (roomIssue) throw new AppError(roomIssue);

  if (!day || !DAYS.includes(day)) {
    throw new AppError("day must be a valid day of the week");
  }

  const period = Number(periodNo);
  if (!Number.isInteger(period) || period < 1) {
    throw new AppError("periodNo must be a valid positive integer");
  }

  const slot = await TimeSlot.findOne({ periodNo: period, isActive: { $ne: false } });
  if (!slot) throw new AppError(`Period ${period} is not configured in time slots`);

  /* ---- conflicts ---- */
  const slotQuery = {
    sessionId: selectedSessionId,
    day,
    periodNo: period,
    isActive: true,
    ...excludeSelf(existingEntryId),
  };

  const when = slotLabel(day, period);

  if (await Timetable.findOne({ ...slotQuery, batchId: batch._id })) {
    throw new AppError(`Class already has a lecture scheduled on ${when}.`, 409);
  }
  if (await Timetable.findOne({ ...slotQuery, teacherId: teacher._id })) {
    throw new AppError(`Teacher already has a lecture scheduled on ${when}.`, 409);
  }
  if (await Timetable.findOne({ ...slotQuery, roomId: room._id })) {
    throw new AppError(`${roomLabel(room)} is already occupied on ${when}.`, 409);
  }

  /* ---- quota per lecture type ---- */
  const split = getLectureSplit(semesterSubject);
  const allowed = type === "practical" ? split.practical : split.theory;

  if (allowed === 0) {
    throw new AppError(`This subject has no ${type} lectures.`);
  }

  const usedOfType = await Timetable.countDocuments({
    batchId: batch._id,
    semesterNo: resolvedSemester,
    semesterSubjectId,
    lectureType: type,
    isActive: true,
    ...excludeSelf(existingEntryId),
  });

  if (usedOfType + 1 > allowed) {
    throw new AppError(
      `Subject weekly ${type} lecture quota is already complete (${usedOfType}/${allowed}).`
    );
  }

  // Soft rule: spread a subject's lectures over different days (warning only)
  const warnings = [];
  const sameDayCount = await Timetable.countDocuments({
    batchId: batch._id,
    semesterNo: resolvedSemester,
    semesterSubjectId,
    day,
    isActive: true,
    ...excludeSelf(existingEntryId),
  });
  if (sameDayCount > 0) {
    warnings.push(`This subject already has a lecture on ${day}. Spreading lectures across days is better.`);
  }

  /* ---- teacher workload ---- */
  const teacherWeekly = await Timetable.countDocuments({
    teacherId: teacher._id,
    sessionId: selectedSessionId,
    isActive: true,
    ...excludeSelf(existingEntryId),
  });
  if (hasLimit(teacher.maxWeeklyLectures) && teacherWeekly + 1 > teacher.maxWeeklyLectures) {
    throw new AppError(
      `Teacher weekly lecture limit exceeded (limit: ${teacher.maxWeeklyLectures}).`,
      409
    );
  }

  const teacherDaily = await Timetable.countDocuments({
    teacherId: teacher._id,
    sessionId: selectedSessionId,
    day,
    isActive: true,
    ...excludeSelf(existingEntryId),
  });
  if (hasLimit(teacher.maxDailyLectures) && teacherDaily + 1 > teacher.maxDailyLectures) {
    throw new AppError(
      `Teacher daily lecture limit exceeded (limit: ${teacher.maxDailyLectures}).`,
      409
    );
  }

  return {
    selectedSessionId,
    programSemester,
    semesterSubject,
    teacherAssignment,
    teacher,
    room,
    type,
    period,
    warnings,
  };
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

export const getBatchTimetableSummary = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      throw new AppError("Valid batchId is required");
    }

    const batch = await Batch.findById(batchId)
      .populate({
        path: "degreeClassId",
        select: "name code programType duration startSemester endSemester departmentId",
      })
      .populate({ path: "shiftId", select: "name" })
      .populate({ path: "startSessionId", select: "name term year degreeClassId" })
      .populate({ path: "departmentId", select: "name code campusId" });

    if (!batch) throw new AppError("Batch not found", 404);

    // Keep ids for queries (degreeClassId / startSessionId are populated above)
    const batchForLogic = {
      _id: batch._id,
      degreeClassId: idOf(batch.degreeClassId),
    };
    const sessionId = idOf(batch.startSessionId);
    const currentSemester = Number(batch.currentSemester || 1);

    const programSemester = await ProgramSemester.findOne({
      degreeClassId: batchForLogic.degreeClassId,
      semesterNo: currentSemester,
      isActive: { $ne: false },
    });

    const semesterSubjects = programSemester
      ? await SemesterSubject.find({
          programSemesterId: programSemester._id,
          isActive: { $ne: false },
        })
          .populate({ path: "subjectId", select: "name code creditHours" })
          .sort({ createdAt: 1 })
      : [];

    // Same class + same subject => reuse the remembered teacher
    await autoAssignDefaultTeachers(batchForLogic, currentSemester, semesterSubjects);

    const [timetableEntries, teacherAssignments, rooms, timeSlots] = await Promise.all([
      populateEntry(
        Timetable.find({ batchId: batch._id, semesterNo: currentSemester, isActive: true })
      ).sort({ day: 1, periodNo: 1 }),
      TeacherAssignment.find({
        batchId: batch._id,
        semesterNo: currentSemester,
        isActive: true,
      })
        .populate({
          path: "semesterSubjectId",
          populate: { path: "subjectId", select: "name code creditHours" },
        })
        .populate({ path: "teacherId", populate: { path: "userId", select: "name email" } })
        .sort({ createdAt: 1 }),
      Room.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean(),
      TimeSlot.find({ isActive: { $ne: false } }).sort({ periodNo: 1 }).lean(),
    ]);

    const assignmentBySubject = new Map(
      teacherAssignments.map((a) => [String(idOf(a.semesterSubjectId)), a])
    );

    const subjectSummaries = semesterSubjects.map((ss) =>
      buildSubjectSummary(ss, timetableEntries, assignmentBySubject.get(String(ss._id)))
    );

    const totalRequiredLectures = subjectSummaries.reduce(
      (sum, s) => sum + s.requiredLectures,
      0
    );
    const scheduledLectures = timetableEntries.length;

    /* ---- teacher workload (2 aggregates instead of N+1 queries) ---- */
    const teacherIds = teacherAssignments.map((a) => idOf(a.teacherId)).filter(Boolean);
    const assignmentIds = teacherAssignments.map((a) => a._id);

    const [weeklyCounts, assignedCounts] = await Promise.all([
      Timetable.aggregate([
        { $match: { isActive: true, sessionId, teacherId: { $in: teacherIds } } },
        { $group: { _id: "$teacherId", n: { $sum: 1 } } },
      ]),
      Timetable.aggregate([
        { $match: { isActive: true, teacherAssignmentId: { $in: assignmentIds } } },
        { $group: { _id: "$teacherAssignmentId", n: { $sum: 1 } } },
      ]),
    ]);

    const weeklyMap = Object.fromEntries(weeklyCounts.map((c) => [String(c._id), c.n]));
    const assignedMap = Object.fromEntries(assignedCounts.map((c) => [String(c._id), c.n]));

    const teacherWorkload = teacherAssignments.map((a) => {
      const t = a.teacherId;
      const weeklyAssigned = weeklyMap[String(idOf(t))] || 0;
      return {
        _id: a._id,
        teacherId: idOf(t),
        teacherName: t?.userId?.name || "Unknown Teacher",
        subjectName: a.semesterSubjectId?.subjectId?.name || "Unknown Subject",
        semesterSubjectId: a.semesterSubjectId?._id,
        requiredLectures: getWeekLectureRequirement(a.semesterSubjectId),
        assignedLectures: assignedMap[String(a._id)] || 0,
        weeklyAssigned,
        remainingCapacity: Math.max((t?.maxWeeklyLectures || 20) - weeklyAssigned, 0),
      };
    });

    return res.json({
      success: true,
      data: {
        batch: {
          _id: batch._id,
          name:
            batch.name ||
            `${batch.degreeClassId?.code || "Batch"}-${batch.startSessionId?.year || ""}`,
          currentSemester,
          totalSemesters: batch.totalSemesters,
          status: batch.status,
          departmentId: batch.departmentId,
          degreeClassId: batch.degreeClassId,
          shiftId: batch.shiftId,
          startSessionId: batch.startSessionId,
        },
        programSemester,
        currentSemester,
        totalSubjects: subjectSummaries.length,
        totalRequiredLectures,
        scheduledLectures,
        remainingLectures: Math.max(totalRequiredLectures - scheduledLectures, 0),
        days: DAYS,
        subjectSummaries,
        semesterSubjects,
        teacherAssignments,
        timetableEntries,
        rooms,
        timeSlots,
        teacherWorkload,
      },
    });
  } catch (error) {
    return sendError(res, error, "Unable to load timetable summary");
  }
};

/* ------------------------------------------------------------------ */
/* Assign teacher (one subject => one teacher per class/batch)         */
/* ------------------------------------------------------------------ */

export const assignTeacher = async (req, res) => {
  try {
    const { batchId, semesterNo, semesterSubjectId, teacherId } = req.body || {};

    if (!batchId || !semesterNo || !semesterSubjectId || !teacherId) {
      throw new AppError("batchId, semesterNo, semesterSubjectId and teacherId are required");
    }
    for (const id of [batchId, semesterSubjectId, teacherId]) {
      if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError("Invalid id provided");
    }

    const [batch, teacher, ss] = await Promise.all([
      Batch.findById(batchId),
      Teacher.findById(teacherId),
      SemesterSubject.findById(semesterSubjectId).populate("programSemesterId", "degreeClassId semesterNo"),
    ]);

    if (!batch) throw new AppError("Batch not found", 404);
    if (!teacher) throw new AppError("Teacher not found", 404);
    if (!ss) throw new AppError("Subject not found", 404);

    if (
      String(ss.programSemesterId?.degreeClassId) !== String(idOf(batch.degreeClassId)) ||
      Number(ss.programSemesterId?.semesterNo) !== Number(semesterNo)
    ) {
      throw new AppError("Subject does not belong to this batch's class/semester");
    }

    // If the teacher changes, move existing lectures to the new teacher (if free)
    const entries = await Timetable.find({
      batchId,
      semesterNo: Number(semesterNo),
      semesterSubjectId,
      isActive: true,
    });

    for (const e of entries) {
      if (String(e.teacherId) === String(teacherId)) continue;
      const busy = await Timetable.findOne({
        teacherId,
        sessionId: e.sessionId,
        day: e.day,
        periodNo: e.periodNo,
        isActive: true,
        _id: { $ne: e._id },
      });
      if (busy) {
        throw new AppError(`New teacher is busy on ${e.day}, period ${e.periodNo}.`, 409);
      }
    }

    const assignment = await TeacherAssignment.findOneAndUpdate(
      { batchId, semesterNo: Number(semesterNo), semesterSubjectId, isActive: true },
      { $set: { teacherId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (entries.length) {
      await Timetable.updateMany({ _id: { $in: entries.map((e) => e._id) } }, { teacherId });
    }

    // Remember for this class only
    await SubjectTeacherDefault.findOneAndUpdate(
      { degreeClassId: ss.programSemesterId.degreeClassId, subjectId: ss.subjectId },
      { teacherId },
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: "Teacher assigned successfully", data: assignment });
  } catch (error) {
    return sendError(res, error, "Teacher could not be assigned");
  }
};

/* ------------------------------------------------------------------ */
/* Timetable CRUD                                                      */
/* ------------------------------------------------------------------ */

export const createTimetableEntry = async (req, res) => {
  try {
    const {
      batchId,
      semesterNo,
      sessionId,
      semesterSubjectId,
      lectureType,
      roomId,
      day,
      periodNo,
    } = req.body || {};

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      throw new AppError("Valid batchId is required");
    }

    const batch = await Batch.findById(batchId);
    if (!batch) throw new AppError("Batch not found", 404);

    const v = await validateTimetablePayload({
      batch,
      sessionId,
      semesterNo,
      semesterSubjectId,
      lectureType,
      roomId,
      day,
      periodNo,
    });

    const doc = await Timetable.create({
      batchId: batch._id,
      sessionId: v.selectedSessionId,
      semesterNo: v.programSemester.semesterNo,
      semesterSubjectId: v.semesterSubject._id,
      teacherAssignmentId: v.teacherAssignment._id,
      teacherId: v.teacher._id,
      roomId: v.room._id,
      lectureType: v.type,
      day,
      periodNo: v.period,
      isActive: true,
    });

    const populated = await populateEntry(Timetable.findById(doc._id));

    return res.status(201).json({
      success: true,
      message: "Timetable entry created successfully",
      warnings: v.warnings,
      data: populated,
    });
  } catch (error) {
    return sendError(res, error, "Timetable entry could not be created");
  }
};

export const updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const existing = await Timetable.findById(id);
    if (!existing || existing.isActive === false) {
      throw new AppError("Timetable entry not found", 404);
    }

    const batch = await Batch.findById(existing.batchId);
    if (!batch) throw new AppError("Batch not found", 404);

    const day = payload.day || existing.day;
    const periodNo = payload.periodNo ?? existing.periodNo;

    const v = await validateTimetablePayload({
      batch,
      sessionId: payload.sessionId || existing.sessionId,
      semesterNo: existing.semesterNo,
      semesterSubjectId: payload.semesterSubjectId || existing.semesterSubjectId,
      lectureType: payload.lectureType || existing.lectureType || "theory",
      roomId: payload.roomId || existing.roomId,
      day,
      periodNo,
      existingEntryId: existing._id,
    });

    const updated = await populateEntry(
      Timetable.findByIdAndUpdate(
        id,
        {
          sessionId: v.selectedSessionId,
          semesterSubjectId: v.semesterSubject._id,
          teacherAssignmentId: v.teacherAssignment._id,
          teacherId: v.teacher._id,
          roomId: v.room._id,
          lectureType: v.type,
          day,
          periodNo: v.period,
        },
        { new: true, runValidators: true }
      )
    );

    return res.json({
      success: true,
      message: "Timetable entry updated successfully",
      warnings: v.warnings,
      data: updated,
    });
  } catch (error) {
    return sendError(res, error, "Timetable entry could not be updated");
  }
};

export const deleteTimetableEntry = async (req, res) => {
  try {
    const deleted = await Timetable.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!deleted) throw new AppError("Timetable entry not found", 404);

    return res.json({
      success: true,
      message: "Timetable entry deleted successfully",
      data: deleted,
    });
  } catch (error) {
    return sendError(res, error, "Timetable entry could not be deleted");
  }
};

/* ------------------------------------------------------------------ */
/* Teacher workload                                                    */
/* ------------------------------------------------------------------ */

export const getTeacherWorkload = async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teacherId)) throw new AppError("Invalid teacherId");

    const teacher = await Teacher.findById(teacherId).populate("userId", "name email");
    if (!teacher) throw new AppError("Teacher not found", 404);

    const entries = await Timetable.find({ teacherId, isActive: true })
      .populate({ path: "batchId", select: "name currentSemester" })
      .populate({
        path: "semesterSubjectId",
        populate: { path: "subjectId", select: "name code creditHours" },
      })
      .populate({ path: "roomId", select: "name code type" })
      .sort({ day: 1, periodNo: 1 });

    const dailyAssigned = entries.reduce((map, e) => {
      map[e.day] = (map[e.day] || 0) + 1;
      return map;
    }, {});

    const maxWeekly = teacher.maxWeeklyLectures || 20;
    const maxDaily = teacher.maxDailyLectures || 4;

    const dailyRemaining = Object.fromEntries(
      DAYS.map((d) => [d, Math.max(maxDaily - (dailyAssigned[d] || 0), 0)])
    );

    return res.json({
      success: true,
      data: {
        teacher: {
          _id: teacher._id,
          name: teacher.userId?.name || "Teacher",
          email: teacher.userId?.email || "",
          maxDailyLectures: maxDaily,
          maxWeeklyLectures: maxWeekly,
        },
        weeklyAssigned: entries.length,
        weeklyRemaining: Math.max(maxWeekly - entries.length, 0),
        dailyAssigned,
        dailyRemaining,
        entries,
      },
    });
  } catch (error) {
    return sendError(res, error, "Unable to load teacher workload");
  }
};

/* ------------------------------------------------------------------ */
/* Availability (free rooms for a day + period)                        */
/* ------------------------------------------------------------------ */

export const getAvailability = async (req, res) => {
  try {
    const { batchId, day, periodNo, sessionId, type } = req.query;

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      throw new AppError("Valid batchId is required");
    }
    if (!DAYS.includes(day)) throw new AppError("Valid day is required");
    if (!Number.isInteger(Number(periodNo))) throw new AppError("Valid periodNo is required");

    const batch = await Batch.findById(batchId);
    if (!batch) throw new AppError("Batch not found", 404);

    const busy = await Timetable.find({
      sessionId: sessionId || batch.startSessionId,
      day,
      periodNo: Number(periodNo),
      isActive: true,
    }).select("roomId teacherId");

    const roomQuery = {
      isActive: { $ne: false },
      _id: { $nin: busy.map((b) => b.roomId) },
    };
    if (type === "practical") roomQuery.type = "lab";

    const rooms = await Room.find(roomQuery).sort({ name: 1 }).lean();

    return res.json({
      success: true,
      data: { rooms, busyTeacherIds: busy.map((b) => b.teacherId) },
    });
  } catch (error) {
    return sendError(res, error, "Unable to load availability");
  }
};

/* ------------------------------------------------------------------ */
/* Automatic generation (constraint-based, in-memory conflict maps)    */
/* ------------------------------------------------------------------ */

const slotKey = (sessionId, id, day, periodNo) => `${sessionId}:${id}:${day}:${periodNo}`;

const reserveSlot = (sid, S, { batchId, teacherId, roomId, day, periodNo }) => {
  S.batchSet.add(slotKey(sid, batchId, day, periodNo));
  S.teacherSet.add(slotKey(sid, teacherId, day, periodNo));
  S.roomSet.add(slotKey(sid, roomId, day, periodNo));

  const weeklyKey = `${sid}:${teacherId}`;
  S.teacherWeekly.set(weeklyKey, (S.teacherWeekly.get(weeklyKey) || 0) + 1);
  const dailyKey = `${weeklyKey}:${day}`;
  S.teacherDaily.set(dailyKey, (S.teacherDaily.get(dailyKey) || 0) + 1);
};

const isTxUnsupported = (err) =>
  err?.code === 20 ||
  /Transaction numbers are only allowed|replica set|transactions? (is|are) not supported/i.test(
    err?.message || ""
  );

// All-or-nothing insert: MongoDB transaction when available, otherwise manual rollback.
const persistEntries = async (docs) => {
  if (!docs.length) return [];

  let session = null;
  try {
    session = await mongoose.startSession();
    let created = [];
    await session.withTransaction(async () => {
      created = await Timetable.insertMany(docs, { session });
    });
    return created;
  } catch (err) {
    if (!isTxUnsupported(err)) throw err;
  } finally {
    if (session) session.endSession();
  }

  // Standalone MongoDB (no transactions): compensate on failure
  const createdIds = [];
  try {
    for (const d of docs) {
      const c = await Timetable.create(d);
      createdIds.push(c._id);
    }
    return createdIds;
  } catch (err) {
    if (createdIds.length) await Timetable.deleteMany({ _id: { $in: createdIds } });
    throw err;
  }
};

const buildGlobalContext = async (batches) => {
  const [rooms, timeSlots] = await Promise.all([
    Room.find({ isActive: { $ne: false } }).sort({ capacity: 1, name: 1 }).lean(),
    TimeSlot.find({ isActive: { $ne: false } }).sort({ periodNo: 1 }).lean(),
  ]);

  const sessions = new Map();
  const sessionIds = new Set(
    batches.map((b) => String(idOf(b.startSessionId))).filter((s) => s && s !== "undefined")
  );

  for (const sid of sessionIds) {
    const entries = await Timetable.find({ sessionId: sid, isActive: true })
      .select("batchId teacherId roomId day periodNo")
      .lean();

    const S = {
      batchSet: new Set(),
      teacherSet: new Set(),
      roomSet: new Set(),
      teacherWeekly: new Map(),
      teacherDaily: new Map(),
    };
    for (const e of entries) reserveSlot(sid, S, e);
    sessions.set(sid, S);
  }

  return { rooms, periods: timeSlots.map((t) => t.periodNo), sessions, teachers: new Map() };
};

const loadTeachers = async (G, teacherIds) => {
  const missing = [...new Set(teacherIds.map(String))].filter((id) => !G.teachers.has(id));
  if (!missing.length) return;
  const docs = await Teacher.find({ _id: { $in: missing } }).populate("userId", "name email");
  for (const t of docs) G.teachers.set(String(t._id), t);
};

const planBatch = async (batch, G) => {
  if (!batch.startSessionId) {
    throw new AppError(`Session is missing for batch ${batch.name || batch._id}`);
  }
  const sid = String(idOf(batch.startSessionId));
  const session = await Session.findById(sid);
  if (!session) throw new AppError("Selected session is invalid");

  const S = G.sessions.get(sid);
  const semesterNo = Number(batch.currentSemester || 1);

  const programSemester = await ProgramSemester.findOne({
    degreeClassId: batch.degreeClassId,
    semesterNo,
    isActive: { $ne: false },
  });
  if (!programSemester) {
    throw new AppError(`No semester configuration found for Semester ${semesterNo}`);
  }

  const semesterSubjects = await SemesterSubject.find({
    programSemesterId: programSemester._id,
    isActive: { $ne: false },
  })
    .populate({ path: "subjectId", select: "name code creditHours" })
    .sort({ createdAt: 1 });

  await autoAssignDefaultTeachers(batch, semesterNo, semesterSubjects);

  const assignments = await TeacherAssignment.find({
    batchId: batch._id,
    semesterNo,
    isActive: true,
  });
  const assignmentBySubject = new Map(assignments.map((a) => [String(a.semesterSubjectId), a]));
  await loadTeachers(G, assignments.map((a) => a.teacherId));

  const existing = await Timetable.find({ batchId: batch._id, semesterNo, isActive: true })
    .select("semesterSubjectId lectureType day")
    .lean();

  const doneByType = new Map();
  const subjectDays = new Map();
  const dayLoad = new Map();
  for (const e of existing) {
    const k = `${e.semesterSubjectId}:${e.lectureType || "theory"}`;
    doneByType.set(k, (doneByType.get(k) || 0) + 1);
    const sk = String(e.semesterSubjectId);
    if (!subjectDays.has(sk)) subjectDays.set(sk, new Set());
    subjectDays.get(sk).add(e.day);
    dayLoad.set(e.day, (dayLoad.get(e.day) || 0) + 1);
  }

  // Build lecture tasks (practical first: they need labs, so they are the most constrained)
  const tasks = [];
  let totalRequired = 0;
  for (const ss of semesterSubjects) {
    const split = getLectureSplit(ss);
    totalRequired += split.total;
    for (const type of LECTURE_TYPES) {
      const remaining = Math.max(split[type] - (doneByType.get(`${ss._id}:${type}`) || 0), 0);
      for (let i = 0; i < remaining; i++) tasks.push({ ss, type, weight: split.total });
    }
  }
  tasks.sort(
    (a, b) =>
      (a.type === "practical" ? 0 : 1) - (b.type === "practical" ? 0 : 1) || b.weight - a.weight
  );

  const docs = [];
  const unscheduledLectures = [];
  const warnings = [];

  for (const { ss, type } of tasks) {
    const subjectName = ss.subjectId?.name || "Unknown Subject";
    const fail = (reason) =>
      unscheduledLectures.push({
        batchId: batch._id,
        semesterSubjectId: ss._id,
        subjectName,
        lectureType: type,
        reason,
      });

    const assignment = assignmentBySubject.get(String(ss._id));
    if (!assignment) {
      fail("No teacher assigned to this subject.");
      continue;
    }
    const teacher = G.teachers.get(String(assignment.teacherId));
    if (!teacher) {
      fail("Assigned teacher not found.");
      continue;
    }

    const weeklyKey = `${sid}:${teacher._id}`;
    if (
      hasLimit(teacher.maxWeeklyLectures) &&
      (S.teacherWeekly.get(weeklyKey) || 0) >= teacher.maxWeeklyLectures
    ) {
      fail("Teacher weekly lecture limit exceeded.");
      continue;
    }

    // Practical => lab only. Theory prefers normal rooms, smallest fitting capacity first.
    const rooms = G.rooms.filter((r) => !roomProblem(r, type, batch));
    if (type === "theory") rooms.sort((a, b) => (a.type === "lab") - (b.type === "lab"));
    if (!rooms.length) {
      fail(
        type === "practical"
          ? "No active lab room available (practical lecture requires a lab room)."
          : "No active room fits this class."
      );
      continue;
    }

    const search = (strict) => {
      const days = [...DAYS].sort((a, b) => (dayLoad.get(a) || 0) - (dayLoad.get(b) || 0));
      for (const day of days) {
        if (strict && subjectDays.get(String(ss._id))?.has(day)) continue;
        if (
          hasLimit(teacher.maxDailyLectures) &&
          (S.teacherDaily.get(`${weeklyKey}:${day}`) || 0) >= teacher.maxDailyLectures
        ) {
          continue;
        }
        for (const period of G.periods) {
          if (S.batchSet.has(slotKey(sid, batch._id, day, period))) continue;
          if (S.teacherSet.has(slotKey(sid, teacher._id, day, period))) continue;
          const room = rooms.find((r) => !S.roomSet.has(slotKey(sid, r._id, day, period)));
          if (room) return { day, period, room };
        }
      }
      return null;
    };

    let pick = search(true);
    let stacked = false;
    if (!pick) {
      pick = search(false);
      stacked = !!pick;
    }

    if (!pick) {
      fail("No free slot where class, teacher and room are all available.");
      continue;
    }

    const { day, period, room } = pick;
    reserveSlot(sid, S, {
      batchId: batch._id,
      teacherId: teacher._id,
      roomId: room._id,
      day,
      periodNo: period,
    });

    dayLoad.set(day, (dayLoad.get(day) || 0) + 1);
    const sk = String(ss._id);
    if (!subjectDays.has(sk)) subjectDays.set(sk, new Set());
    subjectDays.get(sk).add(day);

    if (stacked) {
      warnings.push(`${subjectName}: ${type} lecture placed on ${day} where it already has a lecture (no free day left).`);
    }

    docs.push({
      batchId: batch._id,
      sessionId: sid,
      semesterNo,
      semesterSubjectId: ss._id,
      teacherAssignmentId: assignment._id,
      teacherId: teacher._id,
      roomId: room._id,
      lectureType: type,
      day,
      periodNo: period,
      isActive: true,
    });
  }

  return {
    batchId: batch._id,
    batchName: batch.name || String(batch._id),
    totalRequiredLectures: totalRequired,
    alreadyScheduled: existing.length,
    plannedLectures: docs.length,
    docs,
    unscheduledLectures,
    warnings,
  };
};

/**
 * POST /timetable/batches/:batchId/generate   or   POST /timetable/generate { batchIds: [] }
 * Body options:
 *   dryRun       (default false) -> only plan, save nothing
 *   allowPartial (default false) -> save what fits even if some lectures cannot be placed
 * Default: if everything cannot be scheduled, NOTHING is saved (no half-built timetable).
 */
export const generateTimetable = async (req, res) => {
  try {
    const body = req.body || {};
    const ids = req.params.batchId ? [req.params.batchId] : body.batchIds;

    if (!Array.isArray(ids) || !ids.length || !ids.every((i) => mongoose.Types.ObjectId.isValid(i))) {
      throw new AppError("Valid batchId or batchIds is required");
    }

    const dryRun = body.dryRun === true;
    const allowPartial = body.allowPartial === true;

    const batches = await Batch.find({ _id: { $in: ids } });
    if (batches.length !== new Set(ids.map(String)).size) throw new AppError("Batch not found", 404);

    const G = await buildGlobalContext(batches);

    // Batches share the same maps, so they can never clash with each other either
    const results = [];
    for (const batch of batches) results.push(await planBatch(batch, G));

    const allDocs = results.flatMap((r) => r.docs);
    const unscheduledLectures = results.flatMap((r) => r.unscheduledLectures);
    const warnings = results.flatMap((r) => r.warnings);
    const complete = unscheduledLectures.length === 0;
    const willSave = !dryRun && (complete || allowPartial);

    let conflicts = [];
    let saved = 0;

    if (willSave) {
      try {
        saved = (await persistEntries(allDocs)).length;
      } catch (err) {
        if (err.code === 11000) {
          // Someone else booked a slot while we were planning: everything rolled back
          conflicts = [{ type: "concurrent_booking", message: sendErrorMessage(err) }];
          return res.status(409).json({
            success: false,
            message: "Timetable changed while generating. Nothing was saved, please retry.",
            data: { conflicts, unscheduledLectures },
          });
        }
        throw err;
      }
    }

    const totalRequiredLectures = results.reduce((s, r) => s + r.totalRequiredLectures, 0);
    const alreadyScheduled = results.reduce((s, r) => s + r.alreadyScheduled, 0);
    const scheduledLectures = alreadyScheduled + (willSave ? saved : dryRun ? allDocs.length : 0);
    const remainingLectures = Math.max(totalRequiredLectures - scheduledLectures, 0);

    let message;
    if (dryRun) {
      message = complete
        ? "Dry run: complete timetable is possible. Nothing was saved."
        : `Dry run: ${unscheduledLectures.length} lecture(s) cannot be scheduled. Nothing was saved.`;
    } else if (complete) {
      message = "Timetable generated successfully.";
    } else if (allowPartial) {
      message = `Partial timetable saved. ${unscheduledLectures.length} lecture(s) could not be scheduled.`;
    } else {
      message = `Timetable not generated: ${unscheduledLectures.length} lecture(s) cannot be scheduled. Nothing was saved.`;
    }

    return res.json({
      // true only when every required lecture is scheduled
      success: complete,
      message,
      data: {
        totalRequiredLectures,
        scheduledLectures,
        remainingLectures,
        newlyScheduled: willSave ? saved : 0,
        saved: willSave,
        dryRun,
        conflicts,
        unscheduledLectures,
        warnings,
        batches: results.map(({ docs, ...r }) => r),
      },
    });
  } catch (error) {
    return sendError(res, error, "Timetable could not be generated");
  }
};

const sendErrorMessage = (err) => {
  const kp = err.keyPattern || {};
  if (kp.roomId) return "Room is already occupied at this time.";
  if (kp.teacherId) return "Teacher already has a lecture scheduled at this time.";
  if (kp.batchId) return "Class already has a lecture scheduled at this time.";
  return "Slot was booked by another request.";
};