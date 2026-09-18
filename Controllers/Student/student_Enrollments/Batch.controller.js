import mongoose from "mongoose";

import Batch from "../../../Models/Batch.js";
import BatchSemesterLog from "../../../Models/Batchsemesterlog.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/Degreeclass.js";
import Shift from "../../../Models/Shift.js";
import Session from "../../../Models/Session.js";
import Campus from "../../../Models/Campus.js";
function cleanErrorMessage(err, context = {}) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }

  if (err.code === 11000) {
    if (context.batchName) {
      return `A batch already exists for ${context.batchName}`;
    }

    return "A batch already exists for this class, shift and starting session";
  }

  if (err.name === "ValidationError") {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  return err.message || "Something went wrong, please try again";
}

function getDegreeClassSemesterConfig(degreeClass) {
  const startSemester = Number(degreeClass.startSemester);
  const endSemester = Number(degreeClass.endSemester);

  if (
    !Number.isInteger(startSemester) ||
    !Number.isInteger(endSemester) ||
    startSemester < 1 ||
    endSemester < startSemester
  ) {
    return null;
  }

  return {
    startSemester,
    endSemester,
    totalSemesters: endSemester - startSemester + 1,
  };
}
async function findNextSession(currentSession) {
  if (!currentSession) return null;

  let nextTerm;
  let nextYear = Number(currentSession.year);

  if (currentSession.term === "Spring") {
    nextTerm = "Fall";
  } else {
    nextTerm = "Spring";
    nextYear += 1;
  }

  return Session.findOne({
    degreeClassId: currentSession.degreeClassId,
    term: nextTerm,
    year: nextYear,
  });
}

/* =========================================================
   GET NEXT SESSION
   GET /next?currentSessionId=...
========================================================= */

export const getNextSession = async (req, res) => {
  try {
    const { currentSessionId } = req.query;

    if (!currentSessionId) {
      return res.status(400).json({
        success: false,
        message: "currentSessionId is required",
      });
    }

    const currentSession = await Session.findById(currentSessionId);

    if (!currentSession) {
      return res.status(404).json({
        success: false,
        message: "Current session not found",
      });
    }

    const nextSession = await findNextSession(currentSession);

    if (!nextSession) {
      const expectedTerm =
        currentSession.term === "Spring" ? "Fall" : "Spring";

      const expectedYear =
        currentSession.term === "Spring"
          ? Number(currentSession.year)
          : Number(currentSession.year) + 1;

      return res.status(404).json({
        success: false,
        message: `Next session not found. Expected ${expectedTerm} ${expectedYear}.`,
      });
    }

    return res.json({
      success: true,
      data: nextSession,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
export const createBatch = async (req, res) => {
  const mongoSession = await mongoose.startSession();

  try {
    const { degreeClassId, startSessionId } = req.body;

    if (!degreeClassId || !startSessionId) {
      return res.status(400).json({
        success: false,
        message: "degreeClassId and startSessionId are required",
      });
    }

    const [degreeClass, startSession] = await Promise.all([
      DegreeClass.findById(degreeClassId),
      Session.findById(startSessionId),
    ]);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Invalid degreeClassId",
      });
    }

    if (!startSession) {
      return res.status(400).json({
        success: false,
        message: "Invalid startSessionId",
      });
    }
    if (
      String(startSession.degreeClassId) !==
      String(degreeClass._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Selected start session does not belong to this degree class",
      });
    }
    const semesterConfig =
      getDegreeClassSemesterConfig(degreeClass);

    if (!semesterConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Selected degree class does not have valid startSemester and endSemester values.",
      });
    }

    const {
      startSemester,
      endSemester,
      totalSemesters,
    } = semesterConfig;
    const departmentId =
      degreeClass.departmentId?._id ||
      degreeClass.departmentId;

    if (!departmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Selected degree class does not have a valid department.",
      });
    }
    let shifts = [];

    if (
      Array.isArray(degreeClass.shiftIds) &&
      degreeClass.shiftIds.length
    ) {
      shifts = await Shift.find({
        _id: {
          $in: degreeClass.shiftIds,
        },
        isActive: true,
      });
    } else {
      /*
        Backward compatibility:
        If shiftIds does not exist yet, use
        Shift.degreeClassId
      */

      shifts = await Shift.find({
        degreeClassId,
        isActive: true,
      });
    }

    if (!shifts.length) {
      return res.status(400).json({
        success: false,
        message:
          "No active shifts found for this degree class.",
      });
    }

  
    const existingBatches = await Batch.find({
      degreeClassId,
      startSessionId,
      shiftId: {
        $in: shifts.map((shift) => shift._id),
      },
    }).select("shiftId");

    const shiftsWithExistingBatch = new Set(
      existingBatches.map((batch) =>
        String(batch.shiftId)
      )
    );

    const shiftsToCreate = shifts.filter(
      (shift) =>
        !shiftsWithExistingBatch.has(
          String(shift._id)
        )
    );

    if (!shiftsToCreate.length) {
      return res.status(400).json({
        success: false,
        message:
          "Batches already exist for all shifts of this class and session.",
      });
    }

    
    let createdBatchIds = [];

    const runCreation = async (useTransaction) => {
      const insertOptions = useTransaction
        ? { session: mongoSession }
        : {};

      const batchDocs = await Batch.insertMany(
        shiftsToCreate.map((shift) => ({
          departmentId,
          degreeClassId,
          shiftId: shift._id,

          startSessionId,

          /*
            Actual semester count:
            ADP       = 4
            POST_ADP  = 4
            BS        = 8
          */
          totalSemesters,

          /*
            Important:
            POST_ADP starts from semester 5.
          */
          currentSemester: startSemester,

          status: "active",
        })),
        insertOptions
      );

      createdBatchIds = batchDocs.map(
        (batch) => batch._id
      );

      try {
        await BatchSemesterLog.insertMany(
          batchDocs.map((batch) => ({
            batchId: batch._id,
            sessionId: startSessionId,

            /*
              Important:
              First semester comes from DegreeClass.
              POST_ADP = 5
              ADP/BS = 1
            */
            semester: startSemester,
          })),
          insertOptions
        );
      } catch (logErr) {
        if (!useTransaction) {
          await Batch.deleteMany({
            _id: {
              $in: createdBatchIds,
            },
          });

          createdBatchIds = [];
        }

        throw logErr;
      }
    };

    const isTransactionsUnsupported = (err) => {
      const msg = String(
        err?.message ||
          err?.errmsg ||
          ""
      );

      return (
        err?.code === 20 ||
        err?.codeName === "IllegalOperation" ||
        /replica set member or mongos/i.test(msg) ||
        /Transaction numbers are only allowed/i.test(
          msg
        )
      );
    };

    try {
      await mongoSession.withTransaction(() =>
        runCreation(true)
      );
    } catch (err) {
      if (isTransactionsUnsupported(err)) {
        await runCreation(false);
      } else {
        throw err;
      }
    }

    /* =====================================================
       POPULATE CREATED BATCHES
    ===================================================== */

    const populatedBatches = await Batch.find({
      _id: {
        $in: createdBatchIds,
      },
    })
      .populate({
        path: "departmentId",
        select: "name code campusId",
        populate: {
          path: "campusId",
          select: "name code",
        },
      })
      .populate(
        "degreeClassId",
        "name code programType duration startSemester endSemester"
      )
      .populate(
        "shiftId",
        "name"
      )
      .populate(
        "startSessionId",
        "name term year degreeClassId"
      );

    return res.status(201).json({
      success: true,

      message:
        "Batches created successfully",

      data: populatedBatches,

      meta: {
        programType:
          degreeClass.programType,

        startSemester,

        endSemester,

        totalSemesters,

        shiftsCreated:
          shiftsToCreate.length,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  } finally {
    await mongoSession.endSession();
  }
};

export const getBatches = async (req, res) => {
  try {
    const {
      departmentId,
      degreeClassId,
      shiftId,
      status,
      currentSemester,
    } = req.query;

    const filter = {};

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    if (degreeClassId) {
      filter.degreeClassId = degreeClassId;
    }

    if (shiftId) {
      filter.shiftId = shiftId;
    }

    if (status) {
      filter.status = status;
    }

    if (currentSemester) {
      filter.currentSemester =
        Number(currentSemester);
    }

    const batches = await Batch.find(filter)
      .populate({
        path: "departmentId",
        select: "name code campusId",
        populate: {
          path: "campusId",
          select: "name code",
        },
      })
      .populate(
        "degreeClassId",
        "name code programType duration startSemester endSemester"
      )
      .populate(
        "shiftId",
        "name degreeClassId"
      )
      .populate(
        "startSessionId",
        "name term year degreeClassId"
      )
      .sort({
        createdAt: -1,
      });

    return res.json({
      success: true,
      data: batches,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
}
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(
      req.params.id
    )
      .populate({
        path: "departmentId",
        select: "name code campusId",
        populate: {
          path: "campusId",
          select: "name code",
        },
      })
      .populate(
        "degreeClassId",
        "name code programType duration startSemester endSemester"
      )
      .populate(
        "shiftId",
        "name degreeClassId"
      )
      .populate(
        "startSessionId",
        "name term year degreeClassId"
      );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    return res.json({
      success: true,
      data: batch,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};

/* =========================================================
   GET BATCH SEMESTERS
   GET /:id/semesters
========================================================= */

export const getBatchSemesters = async (
  req,
  res
) => {
  try {
    const batch = await Batch.findById(
      req.params.id
    ).populate(
      "degreeClassId",
      "name code programType duration startSemester endSemester"
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const degreeClass = batch.degreeClassId;

    const semesterConfig =
      getDegreeClassSemesterConfig(
        degreeClass
      );

    if (!semesterConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Batch degree class has invalid semester configuration.",
      });
    }

    const {
      startSemester,
      endSemester,
      totalSemesters,
    } = semesterConfig;

    const logs = await BatchSemesterLog.find({
      batchId: batch._id,
    })
      .populate(
        "sessionId",
        "name term year degreeClassId"
      )
      .sort({
        semester: 1,
      });

    const logMap = new Map();

    for (const log of logs) {
      logMap.set(
        Number(log.semester),
        log
      );
    }
    const semesters = [];
    for (
      let semester = startSemester;
      semester <= endSemester;
      semester++
    ) {
      let status = "pending";

      if (
        batch.status === "completed" ||
        semester < batch.currentSemester
      ) {
        status = "completed";
      } else if (
        semester === batch.currentSemester
      ) {
        status = "active";
      }

      const log = logMap.get(semester);

      semesters.push({
        semester,
        status,

        session: log?.sessionId
          ? {
              _id: log.sessionId._id,
              name: log.sessionId.name,
              term: log.sessionId.term,
              year: log.sessionId.year,
            }
          : null,

        logId: log?._id || null,

        createdAt:
          log?.createdAt || null,

        updatedAt:
          log?.updatedAt || null,
      });
    }

    const currentLog = logMap.get(
      batch.currentSemester
    );

    let nextExpectedSession = null;

    if (
      batch.status !== "completed" &&
      batch.currentSemester < endSemester
    ) {
      const currentSession =
        currentLog?.sessionId;

      if (currentSession) {
        nextExpectedSession =
          await findNextSession(
            currentSession
          );
      }
    }

    return res.json({
      success: true,

      data: {
        batchId: batch._id,

        degreeClass: {
          _id: degreeClass._id,
          name: degreeClass.name,
          code: degreeClass.code,
          programType:
            degreeClass.programType,
          duration:
            degreeClass.duration,
          startSemester,
          endSemester,
        },

        totalSemesters,

        currentSemester:
          batch.currentSemester,

        status: batch.status,

        currentSession:
          currentLog?.sessionId || null,

        nextExpectedSession,

        semesters,

        history: logs,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
export const advanceBatch = async (
  req,
  res
) => {
  try {
    const batch = await Batch.findById(
      req.params.id
    ).populate(
      "degreeClassId",
      "name code programType duration startSemester endSemester"
    );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const semesterConfig =
      getDegreeClassSemesterConfig(
        batch.degreeClassId
      );

    if (!semesterConfig) {
      return res.status(400).json({
        success: false,
        message:
          "Batch degree class has invalid semester configuration.",
      });
    }

    const {
      startSemester,
      endSemester,
    } = semesterConfig;

    if (batch.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "This batch has already completed all semesters",
      });
    }

    const currentLog =
      await BatchSemesterLog.findOne({
        batchId: batch._id,
        semester: batch.currentSemester,
      }).populate("sessionId");

    if (
      !currentLog ||
      !currentLog.sessionId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Current semester session could not be found for this batch",
      });
    }

    const currentSession =
      currentLog.sessionId;
    if (
      batch.currentSemester >= endSemester
    ) {
      batch.status = "completed";

      await batch.save();

      return res.json({
        success: true,

        message:
          "Batch has completed all semesters",

        data: {
          batch,

          completedSemester:
            batch.currentSemester,

          completedSession: {
            _id: currentSession._id,
            name: currentSession.name,
            term: currentSession.term,
            year: currentSession.year,
          },
        },
      });
    }

    /* =====================================================
       NEXT SEMESTER
    ===================================================== */

    const nextSemester =
      batch.currentSemester + 1;

    let nextSession;

    /* =====================================================
       OPTIONAL MANUAL SESSION
    ===================================================== */

    if (req.body?.sessionId) {
      nextSession = await Session.findById(
        req.body.sessionId
      );

      if (!nextSession) {
        return res.status(400).json({
          success: false,
          message: "Invalid sessionId",
        });
      }

      /* Same DegreeClass */

      if (
        String(nextSession.degreeClassId) !==
        String(batch.degreeClassId._id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected session does not belong to this batch's degree class",
        });
      }

      /* Expected next term/year */

      let expectedTerm;
      let expectedYear =
        Number(currentSession.year);

      if (
        currentSession.term === "Spring"
      ) {
        expectedTerm = "Fall";
      } else {
        expectedTerm = "Spring";
        expectedYear += 1;
      }

      if (
        nextSession.term !==
          expectedTerm ||
        Number(nextSession.year) !==
          expectedYear
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid next session. Expected ${expectedTerm} ${expectedYear}`,
        });
      }
    } else {
      nextSession =
        await findNextSession(
          currentSession
        );
      if (!nextSession) {
        const expectedTerm =
          currentSession.term ===
          "Spring"
            ? "Fall"
            : "Spring";
        const expectedYear =
          currentSession.term ===
          "Spring"
            ? Number(currentSession.year)
            : Number(currentSession.year) + 1;
        return res.status(400).json({
          success: false,
          message: `Next session not found. Expected ${expectedTerm} ${expectedYear}`,
        });
      }
    }
    const existingNextLog =
      await BatchSemesterLog.findOne({
        batchId: batch._id,
        semester: nextSemester,
      });
    if (existingNextLog) {
      return res.status(400).json({
        success: false,
        message: `Semester ${nextSemester} has already been assigned to this batch`,
      });
    }
    batch.currentSemester =
      nextSemester;
    batch.status = "active";
    await batch.save();
    const semesterLog =
      await BatchSemesterLog.create({
        batchId: batch._id,
        sessionId: nextSession._id,
        semester: nextSemester,
      });
    if (nextSemester >= endSemester) {
      batch.status = "active";
      await batch.save();
    }
    const updatedBatch =
      await Batch.findById(
        batch._id
      )
        .populate(
          "degreeClassId",
          "name code programType duration startSemester endSemester"
        )
        .populate(
          "shiftId",
          "name"
        )
        .populate(
          "startSessionId",
          "name term year"
        );

    return res.json({
      success: true,

      message: `Batch advanced to semester ${nextSemester} (${nextSession.name})`,

      data: {
        batch: updatedBatch,

        currentSemester:
          nextSemester,

        currentSession: {
          _id: nextSession._id,
          name: nextSession.name,
          term: nextSession.term,
          year: nextSession.year,
        },

        previousSemester: {
          semester:
            nextSemester - 1,

          session: {
            _id: currentSession._id,
            name: currentSession.name,
            term: currentSession.term,
            year: currentSession.year,
          },

          status: "completed",
        },

        currentSemesterStatus:
          "active",

        semesterLog,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
export const updateBatch = async (
  req,
  res
) => {
  try {
    const {
      degreeClassId,
      startSessionId,
    } = req.body;
    const batch = await Batch.findById(
      req.params.id
    );
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }
    const updateData = {};
    if (degreeClassId) {
      const degreeClass =
        await DegreeClass.findById(
          degreeClassId
        );

      if (!degreeClass) {
        return res.status(400).json({
          success: false,
          message: "Invalid degreeClassId",
        });
      }

      const semesterConfig =
        getDegreeClassSemesterConfig(
          degreeClass
        );

      if (!semesterConfig) {
        return res.status(400).json({
          success: false,
          message:
            "Selected degree class does not have valid startSemester and endSemester values.",
        });
      }

      const currentShift =
        await Shift.findById(
          batch.shiftId
        );

      if (
        !currentShift ||
        String(
          currentShift.degreeClassId
        ) !== String(degreeClassId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This batch's current shift does not belong to the new degree class. Create a new batch instead of changing the class.",
        });
      }

      updateData.degreeClassId =
        degreeClassId;

      updateData.departmentId =
        degreeClass.departmentId?._id ||
        degreeClass.departmentId;

      updateData.totalSemesters =
        semesterConfig.totalSemesters;
      if (
        batch.currentSemester ===
        Number(
          batch.startSemester ||
            batch.currentSemester
        )
      ) {
        updateData.currentSemester =
          semesterConfig.startSemester;
      }
    }
    if (startSessionId) {
      const session =
        await Session.findById(
          startSessionId
        );

      if (!session) {
        return res.status(400).json({
          success: false,
          message: "Invalid startSessionId",
        });
      }

      const finalDegreeClassId =
        degreeClassId ||
        batch.degreeClassId;

      if (
        String(session.degreeClassId) !==
        String(finalDegreeClassId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Selected start session does not belong to this degree class",
        });
      }

      updateData.startSessionId =
        startSessionId;
    }
    const updated =
      await Batch.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate({
          path: "departmentId",
          select:
            "name code campusId",
          populate: {
            path: "campusId",
            select: "name code",
          },
        })
        .populate(
          "degreeClassId",
          "name code programType duration startSemester endSemester"
        )
        .populate(
          "shiftId",
          "name"
        )
        .populate(
          "startSessionId",
          "name term year degreeClassId"
        );

    return res.json({
      success: true,
      message:
        "Batch updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
export const deleteBatch = async (
  req,
  res
) => {
  try {
    const batch =
      await Batch.findByIdAndDelete(
        req.params.id
      );

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    await BatchSemesterLog.deleteMany({
      batchId: batch._id,
    });

    return res.json({
      success: true,
      message:
        "Batch and semester history deleted successfully",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};
export const getHierarchy = async (
  req,
  res
) => {
  try {
    const [
      campuses,
      departments,
      degreeClasses,
      shifts,
      batches,
    ] = await Promise.all([
      Campus.find()
        .sort({ name: 1 })
        .lean(),

      Department.find()
        .sort({ name: 1 })
        .lean(),

      DegreeClass.find()
        .sort({ name: 1 })
        .lean(),

      Shift.find()
        .sort({ name: 1 })
        .lean(),

      Batch.find()
        .populate(
          "startSessionId",
          "name term year degreeClassId"
        )
        .sort({
          createdAt: -1,
        })
        .lean(),
    ]);
    const batchesByShift = {};
    for (const batch of batches) {
      const key = String(
        batch.shiftId
      );
      if (!batchesByShift[key]) {
        batchesByShift[key] = [];
      }
      const degreeClass =
        degreeClasses.find(
          (dc) =>
            String(dc._id) ===
            String(batch.degreeClassId)
        );
      batchesByShift[key].push({
        _id: batch._id,
        name:
          degreeClass &&
          batch.startSessionId
            ? `${degreeClass.code}-${batch.startSessionId.year}`
            : null,
        startSessionId:
          batch.startSessionId,
        programType:
          degreeClass?.programType ||
          null,
        duration:
          degreeClass?.duration ||
          null,
        startSemester:
          degreeClass?.startSemester ||
          null,
        endSemester:
          degreeClass?.endSemester ||
          null,
        totalSemesters:
          batch.totalSemesters,
        currentSemester:
          batch.currentSemester,
        status:
          batch.status,
        createdAt:
          batch.createdAt,
        updatedAt:
          batch.updatedAt,
      });
    }
    const shiftsByClass = {};
    for (const shift of shifts) {
      const key = String(
        shift.degreeClassId
      );
      if (!shiftsByClass[key]) {
        shiftsByClass[key] = [];
      }
      shiftsByClass[key].push({
        _id: shift._id,
        name: shift.name,
        isActive:
          shift.isActive,

        batches:
          batchesByShift[
            String(shift._id)
          ] || [],
      });
    }
    const classesByDepartment = {};
    for (const degreeClass of degreeClasses) {
      const key = String(
        degreeClass.departmentId
      );

      if (!classesByDepartment[key]) {
        classesByDepartment[key] = [];
      }

      classesByDepartment[key].push({
        _id: degreeClass._id,

        name: degreeClass.name,

        code: degreeClass.code,

        programType:
          degreeClass.programType,

        duration:
          degreeClass.duration,

        startSemester:
          degreeClass.startSemester,

        endSemester:
          degreeClass.endSemester,

        isActive:
          degreeClass.isActive,

        shifts:
          shiftsByClass[
            String(degreeClass._id)
          ] || [],
      });
    }
    const departmentsByCampus = {};

    for (const department of departments) {
      const key = String(
        department.campusId
      );

      if (!departmentsByCampus[key]) {
        departmentsByCampus[key] = [];
      }

      departmentsByCampus[key].push({
        _id: department._id,

        name: department.name,

        code: department.code,

        description:
          department.description,

        classes:
          classesByDepartment[
            String(department._id)
          ] || [],
      });
    }
    const tree = campuses.map(
      (campus) => ({
        _id: campus._id,

        name: campus.name,

        code: campus.code,

        location:
          campus.location,

        description:
          campus.description,

        isActive:
          campus.isActive,

        departments:
          departmentsByCampus[
            String(campus._id)
          ] || [],
      })
    );

    return res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message:
        err.message ||
        "Something went wrong, please try again",
    });
  }
};
export const getBatchFormOptions =
  async (req, res) => {
    try {
      const { degreeClassId } =
        req.query;

      const [
        campuses,
        departments,
        degreeClasses,
        shifts,
      ] = await Promise.all([
        Campus.find({
          isActive: true,
        })
          .sort({ name: 1 })
          .lean(),

        Department.find()
          .sort({ name: 1 })
          .lean(),

        DegreeClass.find({
          isActive: true,
        })
          .sort({ name: 1 })
          .lean(),

        Shift.find({
          isActive: true,
        })
          .sort({ name: 1 })
          .lean(),
      ]);

      /* ===================================================
         SESSION FILTER
      =================================================== */

      const sessionFilter = {};

      if (degreeClassId) {
        sessionFilter.degreeClassId =
          degreeClassId;
      }

      const sessions =
        await Session.find(
          sessionFilter
        )
          .sort({
            year: 1,
            term: 1,
          })
          .lean();

      /* ===================================================
         SHIFTS BY CLASS
      =================================================== */

      const shiftsByClass = {};

      for (const shift of shifts) {
        const key = String(
          shift.degreeClassId
        );

        if (!shiftsByClass[key]) {
          shiftsByClass[key] = [];
        }

        shiftsByClass[key].push({
          _id: shift._id,
          name: shift.name,
        });
      }

      /* ===================================================
         CLASSES BY DEPARTMENT
      =================================================== */

      const classesByDepartment = {};

      for (const degreeClass of degreeClasses) {
        const key = String(
          degreeClass.departmentId
        );

        if (!classesByDepartment[key]) {
          classesByDepartment[key] = [];
        }

        classesByDepartment[key].push({
          _id: degreeClass._id,

          name: degreeClass.name,

          code: degreeClass.code,

          programType:
            degreeClass.programType,

          duration:
            degreeClass.duration,

          startSemester:
            degreeClass.startSemester,

          endSemester:
            degreeClass.endSemester,

          totalSemesters:
            Number(
              degreeClass.endSemester
            ) -
              Number(
                degreeClass.startSemester
              ) +
              1,

          shifts:
            shiftsByClass[
              String(
                degreeClass._id
              )
            ] || [],
        });
      }

      /* ===================================================
         DEPARTMENTS BY CAMPUS
      =================================================== */

      const departmentsByCampus = {};

      for (const department of departments) {
        const key = String(
          department.campusId
        );

        if (!departmentsByCampus[key]) {
          departmentsByCampus[key] = [];
        }

        departmentsByCampus[key].push({
          _id: department._id,

          name: department.name,

          code: department.code,

          classes:
            classesByDepartment[
              String(department._id)
            ] || [],
        });
      }

      /* ===================================================
         TREE
      =================================================== */

      const tree = campuses.map(
        (campus) => ({
          _id: campus._id,

          name: campus.name,

          code: campus.code,

          departments:
            departmentsByCampus[
              String(campus._id)
            ] || [],
        })
      );

      /* ===================================================
         SESSION RESPONSE
      =================================================== */

      return res.json({
        success: true,

        data: tree,

        sessions: sessions.map(
          (session) => ({
            _id: session._id,

            name: session.name,

            term: session.term,

            year: session.year,

            degreeClassId:
              session.degreeClassId,
          })
        ),
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message:
          err.message ||
          "Something went wrong, please try again",
      });
    }
  };