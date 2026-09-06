import mongoose from "mongoose";
import Batch from "../../../Models/Batch.js";
import BatchSemesterLog from "../../../Models/Batchsemesterlog.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/Degreeclass.js";
import Shift from "../../../Models/Shift.js";
import Session from "../../../Models/Session.js";
import Campus from "../../../Models/Campus.js";


/* =========================================================
   CLEAN ERROR
========================================================= */

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

/* =========================================================
   FIND NEXT SESSION
   IMPORTANT:
   Next session means the first session whose startDate
   is AFTER current session's startDate.
========================================================= */

async function findNextSession(currentSession) {
  if (!currentSession) return null;

  return Session.findOne({
    startDate: {
      $gt: currentSession.startDate,
    },
  }).sort({
    startDate: 1,
  });
}

/* =========================================================
   GET NEXT SESSION
   GET /api/batches/next-session?currentSessionId=xxx
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

    const currentSession =
      await Session.findById(currentSessionId);

    if (!currentSession) {
      return res.status(404).json({
        success: false,
        message: "Current session not found",
      });
    }

    const nextSession =
      await findNextSession(currentSession);

    if (!nextSession) {
      return res.status(404).json({
        success: false,
        message:
          "No next academic session found. Please create the next academic session first.",
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

/* =========================================================
   CREATE BATCH
========================================================= */

export const createBatch = async (req, res) => {
  const session = await mongoose.startSession();

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

    /*
      totalSemesters is NEVER trusted from the frontend.
      It's derived server-side from the DegreeClass's duration
      (in years) — 2 semesters per year.
    */

    if (!degreeClass.duration || degreeClass.duration <= 0) {
      return res.status(400).json({
        success: false,
        message: "Selected degree class does not have a valid duration.",
      });
    }

    const totalSemesters = degreeClass.duration * 2;

    /* departmentId is NEVER trusted from the frontend — always derived from the DegreeClass */

    const departmentId =
      degreeClass.departmentId?._id || degreeClass.departmentId;

    /* All active shifts of this DegreeClass — one Batch will be created per shift */

    const shifts = await Shift.find({
      degreeClassId,
      isActive: true,
    });

    if (!shifts.length) {
      return res.status(400).json({
        success: false,
        message: "No active shifts found for this degree class.",
      });
    }

    /* Skip shifts that already have a batch for this class + session */

    const existingBatches = await Batch.find({
      degreeClassId,
      startSessionId,
      shiftId: { $in: shifts.map((s) => s._id) },
    }).select("shiftId");

    const shiftsWithExistingBatch = new Set(
      existingBatches.map((b) => String(b.shiftId))
    );

    const shiftsToCreate = shifts.filter(
      (shift) => !shiftsWithExistingBatch.has(String(shift._id))
    );

    if (!shiftsToCreate.length) {
      return res.status(400).json({
        success: false,
        message:
          "Batches already exist for all shifts of this class and session.",
      });
    }

    /*
      Create one Batch per remaining shift, all inside a single transaction —
      either every batch (+ its semester log) is created, or none are.

      FALLBACK: transactions only work on a replica set / mongos. On a
      standalone MongoDB (common in local dev) they fail with code 20
      ("Transaction numbers are only allowed on a replica set member or
      mongos"). In that case we fall back to plain sequential inserts
      with a manual best-effort rollback if something fails midway —
      still safe, just not atomic at the storage-engine level.
    */

    let createdBatchIds = [];

    const runCreation = async (useSession) => {
      const insertOptions = useSession ? { session } : {};

      const batchDocs = await Batch.insertMany(
        shiftsToCreate.map((shift) => ({
          departmentId,
          degreeClassId,
          shiftId: shift._id,
          startSessionId,
          totalSemesters,
          currentSemester: 1,
          status: "active",
        })),
        insertOptions
      );

      createdBatchIds = batchDocs.map((b) => b._id);

      try {
        await BatchSemesterLog.insertMany(
          batchDocs.map((batch) => ({
            batchId: batch._id,
            sessionId: startSessionId,
            semester: 1,
          })),
          insertOptions
        );
      } catch (logErr) {
        if (!useSession) {
          // Manual rollback since there's no transaction to abort
          await Batch.deleteMany({ _id: { $in: createdBatchIds } });
          createdBatchIds = [];
        }
        throw logErr;
      }
    };

    const isTransactionsUnsupported = (err) => {
      const msg = String(err?.message || err?.errmsg || "");
      return (
        err?.code === 20 ||
        err?.codeName === "IllegalOperation" ||
        /replica set member or mongos/i.test(msg) ||
        /Transaction numbers are only allowed/i.test(msg)
      );
    };

    try {
      await session.withTransaction(() => runCreation(true));
    } catch (err) {
      if (isTransactionsUnsupported(err)) {
        await runCreation(false);
      } else {
        throw err;
      }
    }

    const populatedBatches = await Batch.find({
      _id: { $in: createdBatchIds },
    })
      .populate({
        path: "departmentId",
        select: "name code campusId",
        populate: { path: "campusId", select: "name code" },
      })
      .populate("degreeClassId", "name code")
      .populate("shiftId", "name")
      .populate("startSessionId", "name term year startDate endDate");

    return res.status(201).json({
      success: true,
      message: "Batches created successfully",
      data: populatedBatches,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  } finally {
    session.endSession();
  }
};

/* =========================================================
   GET ALL BATCHES
========================================================= */

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

    // e.g. ?currentSemester=1 -> only "new" batches that are still in their first semester
    if (currentSemester) {
      filter.currentSemester = Number(currentSemester);
    }

    const batches = await Batch.find(filter)
      .populate({
        path: "departmentId",
        select: "name code campusId",
        populate: { path: "campusId", select: "name code" },
      })
      .populate(
        "degreeClassId",
        "name code"
      )
      .populate(
        "shiftId",
        "name degreeClassId"
      )
      .populate(
        "startSessionId",
        "name term year startDate endDate"
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
};

/* =========================================================
   GET SINGLE BATCH
========================================================= */

export const getBatchById = async (req, res) => {
  try {
    const batch =
      await Batch.findById(req.params.id)
        .populate({
          path: "departmentId",
          select: "name code campusId",
          populate: { path: "campusId", select: "name code" },
        })
        .populate(
          "degreeClassId",
          "name code"
        )
        .populate(
          "shiftId",
          "name degreeClassId"
        )
        .populate(
          "startSessionId",
          "name term year startDate endDate"
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
========================================================= */

export const getBatchSemesters = async (
  req,
  res
) => {
  try {
    const batch =
      await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const completed = [];

    for (
      let i = 1;
      i < batch.currentSemester;
      i++
    ) {
      completed.push(i);
    }

    const pending = [];

    for (
      let i = batch.currentSemester + 1;
      i <= batch.totalSemesters;
      i++
    ) {
      pending.push(i);
    }

    const logs =
      await BatchSemesterLog.find({
        batchId: batch._id,
      })
        .populate(
          "sessionId",
          "name term year startDate endDate"
        )
        .sort({
          semester: 1,
        });

    let nextExpectedSession = null;

    if (batch.status !== "completed") {
      const lastLog =
        logs[logs.length - 1];

      if (lastLog?.sessionId) {
        nextExpectedSession =
          await findNextSession(
            lastLog.sessionId
          );
      }
    }

    return res.json({
      success: true,

      data: {
        completed,

        current:
          batch.status === "completed"
            ? null
            : batch.currentSemester,

        pending,

        status: batch.status,

        history: logs,

        nextExpectedSession,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};

/* =========================================================
   ADVANCE BATCH
   PUT /api/batches/:id/advance

   Body optional:
   {}
   
   OR manually:
   {
      sessionId: "..."
   }
========================================================= */

export const advanceBatch = async (
  req,
  res
) => {
  try {
    const batch =
      await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    if (batch.status === "completed") {
      return res.status(400).json({
        success: false,
        message:
          "This batch has already completed all semesters",
      });
    }

    /* Already at final semester */

    if (
      batch.currentSemester >=
      batch.totalSemesters
    ) {
      batch.status = "completed";

      await batch.save();

      return res.json({
        success: true,
        message:
          "Batch marked as completed",
        data: batch,
      });
    }

    let { sessionId } = req.body;

    /* =====================================================
       MANUAL SESSION
    ===================================================== */

    if (sessionId) {
      const session =
        await Session.findById(sessionId);

      if (!session) {
        return res.status(400).json({
          success: false,
          message: "Invalid sessionId",
        });
      }
    }

    /* =====================================================
       AUTOMATIC SESSION
    ===================================================== */

    else {
      const lastLog =
        await BatchSemesterLog.findOne({
          batchId: batch._id,
        })
          .sort({
            semester: -1,
          })
          .populate("sessionId");

      const currentSession =
        lastLog?.sessionId;

      if (!currentSession) {
        return res.status(400).json({
          success: false,
          message:
            "Could not determine current session for this batch.",
        });
      }

      const nextSession =
        await findNextSession(
          currentSession
        );

      if (!nextSession) {
        return res.status(400).json({
          success: false,
          message:
            `No academic session found after "${currentSession.name}". Please create the next academic session first.`,
        });
      }

      sessionId = nextSession._id;
    }

    /* =====================================================
       ADVANCE
    ===================================================== */

    const nextSemester =
      batch.currentSemester + 1;

    batch.currentSemester =
      nextSemester;

    if (
      nextSemester >=
      batch.totalSemesters
    ) {
      /*
        Is waqt batch semester N par hai,
        isliye abhi completed nahi hoga.
        Final semester complete hone ke baad
        next advance request par completed hoga.
      */
    }

    await batch.save();

    /* =====================================================
       HISTORY
    ===================================================== */

    await BatchSemesterLog.findOneAndUpdate(
      {
        batchId: batch._id,
        sessionId,
      },
      {
        batchId: batch._id,
        sessionId,
        semester: nextSemester,
      },
      {
        upsert: true,
        new: true,
      }
    );

    const usedSession =
      await Session.findById(
        sessionId
      ).select(
        "name term year startDate endDate"
      );

    return res.json({
      success: true,

      message:
        `Batch advanced to semester ${nextSemester} (${usedSession?.name || ""})`,

      data: {
        batch,
        session: usedSession,
        semester: nextSemester,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};

/* =========================================================
   UPDATE BATCH
========================================================= */

export const updateBatch = async (
  req,
  res
) => {
  try {
    const {
      degreeClassId,
      startSessionId,
    } = req.body;

    // departmentId, shiftId, totalSemesters are NEVER accepted from the frontend —
    // they are always derived server-side, same as in createBatch.

    const batch =
      await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    const updateData = {};

    if (degreeClassId) {
      const degreeClass =
        await DegreeClass.findById(degreeClassId);

      if (!degreeClass) {
        return res.status(400).json({
          success: false,
          message: "Invalid degreeClassId",
        });
      }

      if (!degreeClass.duration || degreeClass.duration <= 0) {
        return res.status(400).json({
          success: false,
          message: "Selected degree class does not have a valid duration.",
        });
      }

      // Existing shift must still belong to the new DegreeClass —
      // the API has no way to pick a different shift on its own,
      // so switching class only works if the current shift is shared
      // by that class too. Otherwise the caller must create a new batch.
      const currentShift =
        await Shift.findById(batch.shiftId);

      if (
        !currentShift ||
        String(currentShift.degreeClassId) !== String(degreeClassId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This batch's current shift does not belong to the new degree class. Create a new batch instead of changing the class.",
        });
      }

      updateData.degreeClassId = degreeClassId;
      updateData.departmentId =
        degreeClass.departmentId?._id || degreeClass.departmentId;
      updateData.totalSemesters = degreeClass.duration * 2;
    }

    if (startSessionId) {
      const session = await Session.findById(startSessionId);

      if (!session) {
        return res.status(400).json({
          success: false,
          message: "Invalid startSessionId",
        });
      }

      updateData.startSessionId = startSessionId;
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
          select: "name code campusId",
          populate: { path: "campusId", select: "name code" },
        })
        .populate(
          "degreeClassId",
          "name code"
        )
        .populate(
          "shiftId",
          "name"
        )
        .populate(
          "startSessionId",
          "name term year startDate endDate"
        );

    return res.json({
      success: true,
      message: "Batch updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
  }
};

/* =========================================================
   DELETE BATCH
========================================================= */

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

/* =========================================================
   GET FULL HIERARCHY
   GET /api/hierarchy

   Campus -> Departments -> Degree Classes -> Shifts -> Batches

   Sab collections ek ek dafa fetch karke, phir JS mein
   in-memory group kar rahe hain (5 alag N+1 queries chalane
   ke bajaye) — chahe data zyada ho, ye fast rehta hai.
========================================================= */

export const getHierarchy = async (req, res) => {
  try {
    const [campuses, departments, degreeClasses, shifts, batches] =
      await Promise.all([
        Campus.find().sort({ name: 1 }).lean(),
        Department.find().sort({ name: 1 }).lean(),
        DegreeClass.find().sort({ name: 1 }).lean(),
        Shift.find().sort({ name: 1 }).lean(),
        Batch.find()
          .populate("startSessionId", "name term year startDate endDate")
          .sort({ createdAt: -1 })
          .lean(),
      ]);

    // Batches grouped by shiftId
    const batchesByShift = {};
    for (const batch of batches) {
      const key = String(batch.shiftId);
      if (!batchesByShift[key]) batchesByShift[key] = [];

      const degreeClass = degreeClasses.find(
        (dc) => String(dc._id) === String(batch.degreeClassId)
      );

      batchesByShift[key].push({
        _id: batch._id,
        name:
          degreeClass && batch.startSessionId
            ? `${degreeClass.code}-${batch.startSessionId.year}`
            : null,
        startSessionId: batch.startSessionId,
        totalSemesters: batch.totalSemesters,
        currentSemester: batch.currentSemester,
        status: batch.status,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      });
    }

    // Shifts grouped by degreeClassId, each with its batches attached
    const shiftsByClass = {};
    for (const shift of shifts) {
      const key = String(shift.degreeClassId);
      if (!shiftsByClass[key]) shiftsByClass[key] = [];

      shiftsByClass[key].push({
        _id: shift._id,
        name: shift.name,
        isActive: shift.isActive,
        batches: batchesByShift[String(shift._id)] || [],
      });
    }

    // Degree classes grouped by departmentId, each with its shifts attached
    const classesByDepartment = {};
    for (const degreeClass of degreeClasses) {
      const key = String(degreeClass.departmentId);
      if (!classesByDepartment[key]) classesByDepartment[key] = [];

      classesByDepartment[key].push({
        _id: degreeClass._id,
        name: degreeClass.name,
        code: degreeClass.code,
        duration: degreeClass.duration,
        isActive: degreeClass.isActive,
        shifts: shiftsByClass[String(degreeClass._id)] || [],
      });
    }

    // Departments grouped by campusId, each with its classes attached
    const departmentsByCampus = {};
    for (const department of departments) {
      const key = String(department.campusId);
      if (!departmentsByCampus[key]) departmentsByCampus[key] = [];

      departmentsByCampus[key].push({
        _id: department._id,
        name: department.name,
        code: department.code,
        description: department.description,
        classes: classesByDepartment[String(department._id)] || [],
      });
    }

    // Final tree: Campus at the top
    const tree = campuses.map((campus) => ({
      _id: campus._id,
      name: campus.name,
      code: campus.code,
      location: campus.location,
      description: campus.description,
      isActive: campus.isActive,
      departments: departmentsByCampus[String(campus._id)] || [],
    }));

    return res.json({
      success: true,
      data: tree,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Something went wrong, please try again",
    });
  }
};

/* =========================================================
   GET CREATE-BATCH FORM OPTIONS
   GET /api/batches/form-options

   For the "Create Batch" form:
   Campus -> Departments -> Degree Classes (each with its
   existing Shifts, for reference) + a separate global list
   of Sessions (Session is not scoped to any class, so it's
   returned once at the top level, not nested).
========================================================= */

export const getBatchFormOptions = async (req, res) => {
  try {
    const [campuses, departments, degreeClasses, shifts, sessions] =
      await Promise.all([
        Campus.find({ isActive: true }).sort({ name: 1 }).lean(),
        Department.find().sort({ name: 1 }).lean(),
        DegreeClass.find({ isActive: true }).sort({ name: 1 }).lean(),
        Shift.find({ isActive: true }).sort({ name: 1 }).lean(),
        Session.find().sort({ startDate: 1 }).lean(),
      ]);

    // Shifts grouped by degreeClassId
    const shiftsByClass = {};
    for (const shift of shifts) {
      const key = String(shift.degreeClassId);
      if (!shiftsByClass[key]) shiftsByClass[key] = [];

      shiftsByClass[key].push({
        _id: shift._id,
        name: shift.name,
      });
    }

    // Degree classes grouped by departmentId, each with its shifts attached
    const classesByDepartment = {};
    for (const degreeClass of degreeClasses) {
      const key = String(degreeClass.departmentId);
      if (!classesByDepartment[key]) classesByDepartment[key] = [];

      classesByDepartment[key].push({
        _id: degreeClass._id,
        name: degreeClass.name,
        code: degreeClass.code,
        duration: degreeClass.duration,
        shifts: shiftsByClass[String(degreeClass._id)] || [],
      });
    }

    // Departments grouped by campusId, each with its classes attached
    const departmentsByCampus = {};
    for (const department of departments) {
      const key = String(department.campusId);
      if (!departmentsByCampus[key]) departmentsByCampus[key] = [];

      departmentsByCampus[key].push({
        _id: department._id,
        name: department.name,
        code: department.code,
        classes: classesByDepartment[String(department._id)] || [],
      });
    }

    // Final tree: Campus at the top
    const tree = campuses.map((campus) => ({
      _id: campus._id,
      name: campus.name,
      code: campus.code,
      departments: departmentsByCampus[String(campus._id)] || [],
    }));

    return res.json({
      success: true,
      data: tree,
      sessions: sessions.map((s) => ({
        _id: s._id,
        name: s.name,
        term: s.term,
        year: s.year,
        startDate: s.startDate,
        endDate: s.endDate,
      })),
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Something went wrong, please try again",
    });
  }
};