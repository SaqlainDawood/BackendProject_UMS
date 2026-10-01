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

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value && typeof value === "object" && value._id) return value._id.toString();
  return null;
};

const getWeekLectureRequirement = (semesterSubject) => {
  if (!semesterSubject) return 0;

  if (
    semesterSubject.weeklyLectures !== null &&
    semesterSubject.weeklyLectures !== undefined &&
    semesterSubject.weeklyLectures !== ""
  ) {
    return Number(semesterSubject.weeklyLectures) || 0;
  }

  const subjectCredit = Number(
    semesterSubject.creditHours ?? semesterSubject.subjectId?.creditHours ?? 0
  );

  const theoryHours = Number(
    semesterSubject.theoryHours ??
      (semesterSubject.deliveryType === "theory" ? subjectCredit : 0) ??
      0
  );

  const practicalHours = Number(
    semesterSubject.practicalHours ??
      (semesterSubject.deliveryType === "practical" ? subjectCredit : 0) ??
      0
  );

  if (theoryHours || practicalHours) {
    return theoryHours + practicalHours;
  }

  return subjectCredit || 0;
};

const buildSubjectSummary = (semesterSubject, timetableEntries = []) => {
  const subject = semesterSubject?.subjectId || semesterSubject?.subject || null;
  const requiredLectures = getWeekLectureRequirement(semesterSubject);

  const plannedEntries = timetableEntries.filter(
    (entry) =>
      String(entry.semesterSubjectId?._id || entry.semesterSubjectId) ===
      String(semesterSubject._id)
  );

  const scheduledLectures = plannedEntries.length;

  return {
    _id: semesterSubject._id,
    subjectId: subject?._id || semesterSubject.subjectId,
    subjectName: subject?.name || "Unknown Subject",
    subjectCode: subject?.code || "N/A",
    creditHours: subject?.creditHours || semesterSubject.creditHours || 0,
    deliveryType: semesterSubject.deliveryType || "theory",
    requiredLectures,
    scheduledLectures,
    remainingLectures: Math.max(requiredLectures - scheduledLectures, 0),
    isComplete: scheduledLectures >= requiredLectures,
    subjectType: semesterSubject.subjectType || "COMPULSORY",
  };
};

const validateTimetablePayload = async ({
  batch,
  sessionId,
  semesterNo,
  semesterSubjectId,
  teacherAssignmentId,
  teacherId,
  roomId,
  day,
  periodNo,
  existingEntryId = null,
}) => {
  if (!batch) {
    throw new Error("Batch not found");
  }

  const resolvedSemester = Number(semesterNo ?? batch.currentSemester ?? 1);
  if (!Number.isInteger(resolvedSemester) || resolvedSemester < 1) {
    throw new Error("Invalid semester number");
  }

  const selectedSessionId = sessionId || batch.startSessionId;
  if (!selectedSessionId) {
    throw new Error("Session is missing for the selected batch");
  }

  const selectedSession = await Session.findById(selectedSessionId);
  if (!selectedSession) {
    throw new Error("Selected session is invalid");
  }

  const programSemester = await ProgramSemester.findOne({
    degreeClassId: batch.degreeClassId,
    semesterNo: resolvedSemester,
    isActive: { $ne: false },
  });

  if (!programSemester) {
    throw new Error(
      `No semester configuration found for batch degree class in Semester ${resolvedSemester}`
    );
  }

  if (!semesterSubjectId) {
    throw new Error("semesterSubjectId is required");
  }

  const semesterSubject = await SemesterSubject.findById(semesterSubjectId).populate(
    "subjectId",
    "name code creditHours"
  );

  if (!semesterSubject) {
    throw new Error("Semester subject not found");
  }

  if (String(semesterSubject.programSemesterId) !== String(programSemester._id)) {
    throw new Error(
      "Selected subject does not belong to the selected batch semester."
    );
  }

  let teacherAssignment = null;

  if (teacherAssignmentId) {
    teacherAssignment = await TeacherAssignment.findOne({
      _id: teacherAssignmentId,
      batchId: batch._id,
      semesterNo: resolvedSemester,
      isActive: true,
    }).populate({
      path: "semesterSubjectId",
      populate: { path: "subjectId", select: "name code creditHours" },
    });

    if (!teacherAssignment) {
      throw new Error("Teacher assignment does not belong to this batch and semester");
    }
  } else {
    teacherAssignment = await TeacherAssignment.findOne({
      batchId: batch._id,
      semesterNo: resolvedSemester,
      semesterSubjectId,
      isActive: true,
    });
  }

  if (!teacherAssignment) {
    throw new Error("No active teacher assignment found for this subject in the selected batch");
  }

  const teacher = await Teacher.findById(
    teacherId || teacherAssignment.teacherId
  ).populate("userId", "name email");

  if (!teacher) {
    throw new Error("Assigned teacher not found");
  }

  if (String(teacher._id) !== String(teacherAssignment.teacherId)) {
    throw new Error("Selected teacher does not match the assigned teacher for this subject");
  }

  if (!roomId) {
    throw new Error("roomId is required");
  }

  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error("Room not found");
  }

  if (!day || !DAYS.includes(day)) {
    throw new Error("day must be a valid day of the week");
  }

  if (!Number.isInteger(Number(periodNo)) || Number(periodNo) < 1) {
    throw new Error("periodNo must be a valid positive integer");
  }

  const teacherConflict = await Timetable.findOne({
    teacherId: teacher._id,
    sessionId: selectedSessionId,
    day,
    periodNo: Number(periodNo),
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (teacherConflict) {
    throw new Error("Teacher already has a lecture scheduled at this time.");
  }

  const batchConflict = await Timetable.findOne({
    batchId: batch._id,
    sessionId: selectedSessionId,
    day,
    periodNo: Number(periodNo),
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (batchConflict) {
    throw new Error("Batch already has a lecture scheduled at this time.");
  }

  const roomConflict = await Timetable.findOne({
    roomId: room._id,
    sessionId: selectedSessionId,
    day,
    periodNo: Number(periodNo),
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (roomConflict) {
    throw new Error("Room is already assigned to another class at this time.");
  }

  const requiredLectures = getWeekLectureRequirement(semesterSubject);
  const entriesForThisSubject = await Timetable.find({
    batchId: batch._id,
    semesterSubjectId,
    teacherAssignmentId: teacherAssignment._id,
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (entriesForThisSubject.length + 1 > requiredLectures) {
    throw new Error(
      `Subject lecture quota exceeded. Required: ${requiredLectures}, scheduled: ${entriesForThisSubject.length}.`
    );
  }

  const teacherWeeklyAssigned = await Timetable.countDocuments({
    teacherId: teacher._id,
    sessionId: selectedSessionId,
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (teacher.maxWeeklyLectures && teacherWeeklyAssigned + 1 > teacher.maxWeeklyLectures) {
    throw new Error(
      `Teacher workload limit exceeded. Weekly limit: ${teacher.maxWeeklyLectures}.`
    );
  }

  const teacherDailyAssigned = await Timetable.countDocuments({
    teacherId: teacher._id,
    sessionId: selectedSessionId,
    day,
    isActive: true,
    _id: { $ne: existingEntryId || undefined },
  });

  if (teacher.maxDailyLectures && teacherDailyAssigned + 1 > teacher.maxDailyLectures) {
    throw new Error(
      `Teacher daily lecture limit exceeded. Daily limit: ${teacher.maxDailyLectures}.`
    );
  }

  return {
    batch,
    selectedSession,
    selectedSessionId,
    programSemester,
    semesterSubject,
    teacherAssignment,
    teacher,
    room,
    requiredLectures,
  };
};

export const getBatchTimetableSummary = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid batchId is required",
      });
    }

    const batch = await Batch.findById(batchId)
      .populate({ path: "degreeClassId", select: "name code programType duration startSemester endSemester departmentId" })
      .populate({ path: "shiftId", select: "name" })
      .populate({ path: "startSessionId", select: "name term year degreeClassId" })
      .populate({ path: "departmentId", select: "name code campusId" });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const currentSemester = Number(batch.currentSemester || 1);
    const programSemester = await ProgramSemester.findOne({
      degreeClassId: batch.degreeClassId,
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

    const timetableEntries = await Timetable.find({
      batchId: batch._id,
      isActive: true,
    })
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
      .populate({ path: "roomId", select: "name code type" })
      .sort({ day: 1, periodNo: 1 });

    const teacherAssignments = await TeacherAssignment.find({
      batchId: batch._id,
      semesterNo: currentSemester,
      isActive: true,
    })
      .populate({
        path: "semesterSubjectId",
        populate: { path: "subjectId", select: "name code creditHours" },
      })
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: 1 });

    const rooms = await Room.find({ isActive: { $ne: false } }).sort({ name: 1 }).lean();
    const timeSlots = await TimeSlot.find({ isActive: { $ne: false } }).sort({ periodNo: 1 }).lean();

    const subjectSummaries = semesterSubjects.map((semesterSubject) =>
      buildSubjectSummary(semesterSubject, timetableEntries)
    );

    const totalRequiredLectures = subjectSummaries.reduce(
      (sum, subject) => sum + Number(subject.requiredLectures || 0),
      0
    );

    const scheduledLectures = timetableEntries.length;
    const remainingLectures = Math.max(totalRequiredLectures - scheduledLectures, 0);

    const workloadSummary = await Promise.all(
      teacherAssignments.map(async (assignment) => {
        const teacherId = normalizeId(assignment.teacherId);
        const weeklyAssigned = await Timetable.countDocuments({
          teacherId,
          sessionId: batch.startSessionId,
          isActive: true,
        });

        const teacher = await Teacher.findById(teacherId).populate("userId", "name email");

        return {
          _id: assignment._id,
          teacherId: teacherId,
          teacherName: teacher?.userId?.name || "Unknown Teacher",
          subjectName:
            assignment?.semesterSubjectId?.subjectId?.name || "Unknown Subject",
          semesterSubjectId: assignment.semesterSubjectId?._id,
          requiredLectures: getWeekLectureRequirement(assignment.semesterSubjectId),
          assignedLectures: await Timetable.countDocuments({
            teacherAssignmentId: assignment._id,
            isActive: true,
          }),
          weeklyAssigned,
          remainingCapacity: Math.max((teacher?.maxWeeklyLectures || 20) - weeklyAssigned, 0),
        };
      })
    );

    return res.json({
      success: true,
      data: {
        batch: {
          _id: batch._id,
          name: batch.name || `${batch.degreeClassId?.code || "Batch"}-${batch.startSessionId?.year || ""}`,
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
        remainingLectures,
        subjectSummaries,
        semesterSubjects,
        teacherAssignments,
        timetableEntries,
        rooms,
        timeSlots,
        teacherWorkload: workloadSummary,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to load timetable summary",
    });
  }
};

export const createTimetableEntry = async (req, res) => {
  try {
    const payload = req.body || {};
    const { batchId, semesterNo, sessionId, semesterSubjectId, teacherAssignmentId, teacherId, roomId, day, periodNo } = payload;

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
      return res.status(400).json({
        success: false,
        message: "Valid batchId is required",
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const validation = await validateTimetablePayload({
      batch,
      sessionId,
      semesterNo,
      semesterSubjectId,
      teacherAssignmentId,
      teacherId,
      roomId,
      day,
      periodNo,
    });

    const doc = await Timetable.create({
      batchId: batch._id,
      sessionId: validation.selectedSessionId,
      semesterNo: validation.programSemester.semesterNo,
      semesterSubjectId: validation.semesterSubject._id,
      teacherAssignmentId: validation.teacherAssignment._id,
      teacherId: validation.teacher._id,
      roomId: validation.room._id,
      day,
      periodNo: Number(periodNo),
      isActive: true,
    });

    const populatedDoc = await Timetable.findById(doc._id)
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
      .populate({ path: "roomId", select: "name code type" });

    return res.status(201).json({
      success: true,
      message: "Timetable entry created successfully",
      data: populatedDoc,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Timetable entry could not be created",
    });
  }
};

export const updateTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const existingEntry = await Timetable.findById(id);
    if (!existingEntry) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found",
      });
    }

    const batch = await Batch.findById(payload.batchId || existingEntry.batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const validation = await validateTimetablePayload({
      batch,
      sessionId: payload.sessionId || existingEntry.sessionId,
      semesterNo: payload.semesterNo || existingEntry.semesterNo,
      semesterSubjectId: payload.semesterSubjectId || existingEntry.semesterSubjectId,
      teacherAssignmentId: payload.teacherAssignmentId || existingEntry.teacherAssignmentId,
      teacherId: payload.teacherId || existingEntry.teacherId,
      roomId: payload.roomId || existingEntry.roomId,
      day: payload.day || existingEntry.day,
      periodNo: payload.periodNo ?? existingEntry.periodNo,
      existingEntryId: existingEntry._id,
    });

    const updated = await Timetable.findByIdAndUpdate(
      id,
      {
        batchId: batch._id,
        sessionId: validation.selectedSessionId,
        semesterNo: validation.programSemester.semesterNo,
        semesterSubjectId: validation.semesterSubject._id,
        teacherAssignmentId: validation.teacherAssignment._id,
        teacherId: validation.teacher._id,
        roomId: validation.room._id,
        day: payload.day || existingEntry.day,
        periodNo: Number(payload.periodNo ?? existingEntry.periodNo),
      },
      { new: true, runValidators: true }
    )
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
      .populate({ path: "roomId", select: "name code type" });

    return res.json({
      success: true,
      message: "Timetable entry updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Timetable entry could not be updated",
    });
  }
};

export const deleteTimetableEntry = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Timetable.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Timetable entry not found",
      });
    }

    return res.json({
      success: true,
      message: "Timetable entry deleted successfully",
      data: deleted,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Timetable entry could not be deleted",
    });
  }
};

export const getTeacherWorkload = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId).populate("userId", "name email");

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const workloadEntries = await Timetable.find({
      teacherId,
      isActive: true,
    })
      .populate({ path: "batchId", select: "name currentSemester" })
      .populate({
        path: "semesterSubjectId",
        populate: { path: "subjectId", select: "name code creditHours" },
      })
      .sort({ day: 1, periodNo: 1 });

    const weeklyAssigned = workloadEntries.length;
    const dailyAssigned = workloadEntries.reduce((map, entry) => {
      map[entry.day] = (map[entry.day] || 0) + 1;
      return map;
    }, {});

    const maxWeekly = teacher.maxWeeklyLectures || 20;
    const maxDaily = teacher.maxDailyLectures || 4;

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
        weeklyAssigned,
        weeklyRemaining: Math.max(maxWeekly - weeklyAssigned, 0),
        dailyAssigned,
        dailyRemaining: Math.max(maxDaily - (dailyAssigned["Monday"] || 0), 0),
        entries: workloadEntries,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Unable to load teacher workload",
    });
  }
};
