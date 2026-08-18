import Batch from "../../../Models/Batch.js";
import BatchSemesterLog from "../../../Models/Batchsemesterlog.js";
import Department from "../../../Models/Department.js";
import DegreeClass from "../../../Models/Degreeclass.js";
import Shift from "../../../Models/Shift.js";
import Session from "../../../Models/Session.js";


/* =========================================================
   CLEAN ERROR
========================================================= */

function cleanErrorMessage(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }

  if (err.code === 11000) {
    return "A batch already exists for this department, class, shift and starting session";
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
  try {
    const {
      departmentId,
      degreeClassId,
      shiftId,
      startSessionId,
      totalSemesters,
    } = req.body;

    if (
      !departmentId ||
      !degreeClassId ||
      !shiftId ||
      !startSessionId ||
      !totalSemesters
    ) {
      return res.status(400).json({
        success: false,
        message:
          "departmentId, degreeClassId, shiftId, startSessionId and totalSemesters are required",
      });
    }

    const [
      department,
      degreeClass,
      shift,
      session,
    ] = await Promise.all([
      Department.findById(departmentId),
      DegreeClass.findById(degreeClassId),
      Shift.findById(shiftId),
      Session.findById(startSessionId),
    ]);

    if (!department) {
      return res.status(400).json({
        success: false,
        message: "Invalid departmentId",
      });
    }

    if (!degreeClass) {
      return res.status(400).json({
        success: false,
        message: "Invalid degreeClassId",
      });
    }

    if (!shift) {
      return res.status(400).json({
        success: false,
        message: "Invalid shiftId",
      });
    }

    if (!session) {
      return res.status(400).json({
        success: false,
        message: "Invalid startSessionId",
      });
    }

    /* Department -> Degree Class */

    const classDepartmentId =
      degreeClass.departmentId?._id ||
      degreeClass.departmentId;

    if (
      String(classDepartmentId) !==
      String(departmentId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This class does not belong to the selected department",
      });
    }

    /* Degree Class -> Shift */

    const shiftDegreeClassId =
      shift.degreeClassId?._id ||
      shift.degreeClassId;

    /*
      IMPORTANT:

      Agar shift.degreeClassId null hai,
      to backend ke current data ke mutabiq
      shift kisi class ke saath attached nahi hai.

      Is case mein batch create allow nahi karna.
    */

    if (!shiftDegreeClassId) {
      return res.status(400).json({
        success: false,
        message:
          "This shift is not assigned to any degree class",
      });
    }

    if (
      String(shiftDegreeClassId) !==
      String(degreeClassId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This shift does not belong to the selected class",
      });
    }

    /* Create batch */

    const batch = await Batch.create({
      departmentId,
      degreeClassId,
      shiftId,
      startSessionId,
      totalSemesters: Number(totalSemesters),
      currentSemester: 1,
      status: "active",
    });

    /* First semester history */

    await BatchSemesterLog.create({
      batchId: batch._id,
      sessionId: startSessionId,
      semester: 1,
    });

    const populatedBatch =
      await Batch.findById(batch._id)
        .populate("departmentId", "name code")
        .populate("degreeClassId", "name code")
        .populate("shiftId", "name")
        .populate(
          "startSessionId",
          "name term year startDate endDate"
        );

    return res.status(201).json({
      success: true,
      message: "Batch created successfully",
      data: populatedBatch,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanErrorMessage(err),
    });
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

    const batches = await Batch.find(filter)
      .populate(
        "departmentId",
        "name code"
      )
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
        .populate(
          "departmentId",
          "name code"
        )
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
      departmentId,
      degreeClassId,
      shiftId,
      startSessionId,
      totalSemesters,
    } = req.body;

    const batch =
      await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Batch not found",
      });
    }

    /* Optional hierarchy validation */

    if (departmentId || degreeClassId) {
      const finalDepartmentId =
        departmentId ||
        batch.departmentId;

      const finalDegreeClassId =
        degreeClassId ||
        batch.degreeClassId;

      const degreeClass =
        await DegreeClass.findById(
          finalDegreeClassId
        );

      if (!degreeClass) {
        return res.status(400).json({
          success: false,
          message: "Invalid degreeClassId",
        });
      }

      if (
        String(
          degreeClass.departmentId
        ) !== String(finalDepartmentId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This class does not belong to the selected department",
        });
      }
    }

    /* Shift validation */

    if (shiftId || degreeClassId) {
      const finalShiftId =
        shiftId || batch.shiftId;

      const finalDegreeClassId =
        degreeClassId ||
        batch.degreeClassId;

      const shift =
        await Shift.findById(
          finalShiftId
        );

      if (!shift) {
        return res.status(400).json({
          success: false,
          message: "Invalid shiftId",
        });
      }

      if (!shift.degreeClassId) {
        return res.status(400).json({
          success: false,
          message:
            "This shift is not assigned to any degree class",
        });
      }

      if (
        String(
          shift.degreeClassId
        ) !== String(finalDegreeClassId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This shift does not belong to the selected class",
        });
      }
    }

    const updateData = {};

    if (departmentId)
      updateData.departmentId =
        departmentId;

    if (degreeClassId)
      updateData.degreeClassId =
        degreeClassId;

    if (shiftId)
      updateData.shiftId = shiftId;

    if (startSessionId)
      updateData.startSessionId =
        startSessionId;

    if (totalSemesters)
      updateData.totalSemesters =
        Number(totalSemesters);

    const updated =
      await Batch.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "departmentId",
          "name code"
        )
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