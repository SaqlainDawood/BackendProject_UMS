import Session from "../../../Models/Session.js";
import DegreeClass from "../../../Models/Degreeclass.js";


// =========================================================
// CLEAN ERROR
// =========================================================

function cleanError(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }

  if (err.code === 11000) {
    return "This session already exists for this degree class";
  }

  if (err.name === "ValidationError") {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  return err.message || "Something went wrong";
}


// =========================================================
// GENERATE SESSIONS FOR DEGREE CLASS
//
// Example:
// Degree Class = BSIT
// Duration = 4 years
// Start Year = 2026
//
// Semester 1 -> Spring 2026
// Semester 2 -> Fall 2026
// Semester 3 -> Spring 2027
// Semester 4 -> Fall 2027
// Semester 5 -> Spring 2028
// Semester 6 -> Fall 2028
// Semester 7 -> Spring 2029
// Semester 8 -> Fall 2029
// =========================================================

export const generateSessionsForDegreeClass = async (req, res) => {
  try {
    const { degreeClassId, startYear } = req.body;

    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (!degreeClassId || startYear === undefined) {
      return res.status(400).json({
        success: false,
        message: "degreeClassId and startYear are required",
      });
    }

    const year = Number(startYear);

    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        success: false,
        message: "startYear must be a valid year",
      });
    }


    // -----------------------------------------------------
    // GET DEGREE CLASS
    // -----------------------------------------------------

    const degreeClass = await DegreeClass.findById(degreeClassId);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Degree Class not found",
      });
    }


    // -----------------------------------------------------
    // CHECK DURATION
    // -----------------------------------------------------

    if (
      !degreeClass.duration ||
      Number(degreeClass.duration) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Degree Class duration is required to generate sessions",
      });
    }


    // -----------------------------------------------------
    // TOTAL SEMESTERS
    // -----------------------------------------------------

    const totalSemesters =
      Number(degreeClass.duration) * 2;


    const created = [];
    const skipped = [];


    // -----------------------------------------------------
    // GENERATE SESSION
    //
    // Odd semester  = Spring
    // Even semester = Fall
    // -----------------------------------------------------

    for (
      let semester = 1;
      semester <= totalSemesters;
      semester++
    ) {

      const term =
        semester % 2 === 1
          ? "Spring"
          : "Fall";


      const sessionYear =
        year + Math.floor((semester - 1) / 2);


      const sessionName =
        `${term} ${sessionYear}`;


      // ---------------------------------------------------
      // CHECK EXISTING SESSION
      // ---------------------------------------------------

      const existingSession =
        await Session.findOne({
          degreeClassId: degreeClass._id,
          term,
          year: sessionYear,
        });


      if (existingSession) {
        skipped.push({
          semester,
          sessionId: existingSession._id,
          name: existingSession.name,
        });

        continue;
      }


      // ---------------------------------------------------
      // CREATE SESSION
      // ---------------------------------------------------

      const session = await Session.create({
        name: sessionName,
        degreeClassId: degreeClass._id,
        term,
        year: sessionYear,
        isActive: false,
      });


      created.push({
        semester,
        session,
      });
    }


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        `${created.length} session(s) created, ` +
        `${skipped.length} skipped`,

      data: {
        degreeClass: {
          id: degreeClass._id,
          name: degreeClass.name,
          code: degreeClass.code,
          duration: degreeClass.duration,
        },

        totalSemesters,

        startSession: `Spring ${year}`,

        created,

        skipped,
      },
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// CREATE SINGLE SESSION
// =========================================================

export const createSession = async (req, res) => {
  try {

    const {
      degreeClassId,
      name,
      term,
      year,
      isActive,
    } = req.body;


    // -----------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------

    if (
      !degreeClassId ||
      !name ||
      !term ||
      !year
    ) {
      return res.status(400).json({
        success: false,
        message:
          "degreeClassId, name, term and year are required",
      });
    }


    // -----------------------------------------------------
    // CHECK DEGREE CLASS
    // -----------------------------------------------------

    const degreeClass =
      await DegreeClass.findById(degreeClassId);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Degree Class not found",
      });
    }


    // -----------------------------------------------------
    // ACTIVE SESSION
    //
    // Only one active session per DegreeClass
    // -----------------------------------------------------

    if (isActive === true) {
      await Session.updateMany(
        {
          degreeClassId: degreeClass._id,
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }


    // -----------------------------------------------------
    // CREATE
    // -----------------------------------------------------

    const session = await Session.create({
      degreeClassId: degreeClass._id,
      name,
      term,
      year,
      isActive: Boolean(isActive),
    });


    return res.status(201).json({
      success: true,
      data: session,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// GET ALL SESSIONS
//
// Optional:
// ?degreeClassId=xxx
// ?term=Spring
// ?year=2026
// =========================================================

export const getSessions = async (req, res) => {
  try {

    const {
      degreeClassId,
      term,
      year,
    } = req.query;


    const filter = {};


    if (degreeClassId) {
      filter.degreeClassId = degreeClassId;
    }


    if (term) {
      filter.term = term;
    }


    if (year) {
      filter.year = Number(year);
    }


    const sessions =
      await Session.find(filter)
        .populate(
          "degreeClassId",
          "name code duration"
        )
        .sort({
          year: 1,
        });


    // Spring before Fall
    sessions.sort((a, b) => {

      if (a.year !== b.year) {
        return a.year - b.year;
      }

      if (a.term === b.term) {
        return 0;
      }

      return a.term === "Spring"
        ? -1
        : 1;
    });


    return res.json({
      success: true,
      data: sessions,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// CURRENT ACTIVE SESSION FOR DEGREE CLASS
//
// GET:
// /sessions/current?degreeClassId=xxx
// =========================================================

export const getCurrentSession = async (req, res) => {
  try {

    const { degreeClassId } = req.query;


    if (!degreeClassId) {
      return res.status(400).json({
        success: false,
        message: "degreeClassId is required",
      });
    }


    const session =
      await Session.findOne({
        degreeClassId,
        isActive: true,
      })
        .populate(
          "degreeClassId",
          "name code duration"
        );


    if (!session) {
      return res.status(404).json({
        success: false,
        message:
          "No active session found for this degree class",
      });
    }


    return res.json({
      success: true,
      data: session,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// GET SINGLE SESSION
// =========================================================

export const getSessionById = async (req, res) => {
  try {

    const session =
      await Session.findById(req.params.id)
        .populate(
          "degreeClassId",
          "name code duration"
        );


    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }


    return res.json({
      success: true,
      data: session,
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// UPDATE SESSION
// =========================================================

export const updateSession = async (req, res) => {
  try {

    const {
      degreeClassId,
      name,
      term,
      year,
      isActive,
    } = req.body;


    const existingSession =
      await Session.findById(req.params.id);


    if (!existingSession) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }


    // -----------------------------------------------------
    // VALIDATE DEGREE CLASS IF CHANGED
    // -----------------------------------------------------

    if (degreeClassId !== undefined) {

      const degreeClass =
        await DegreeClass.findById(degreeClassId);

      if (!degreeClass) {
        return res.status(404).json({
          success: false,
          message: "Degree Class not found",
        });
      }
    }


    const updateData = {};


    if (degreeClassId !== undefined) {
      updateData.degreeClassId = degreeClassId;
    }

    if (name !== undefined) {
      updateData.name = name;
    }

    if (term !== undefined) {
      updateData.term = term;
    }

    if (year !== undefined) {
      updateData.year = Number(year);
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }


    // -----------------------------------------------------
    // ACTIVE SESSION PER DEGREE CLASS
    // -----------------------------------------------------

    if (isActive === true) {

      const activeDegreeClassId =
        degreeClassId ||
        existingSession.degreeClassId;


      await Session.updateMany(
        {
          degreeClassId: activeDegreeClassId,
          _id: {
            $ne: req.params.id,
          },
        },
        {
          $set: {
            isActive: false,
          },
        }
      );
    }


    const session =
      await Session.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "degreeClassId",
          "name code duration"
        );


    return res.json({
      success: true,
      data: session,
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// SESSION STATUS
//
// Optional:
// ?degreeClassId=xxx
// =========================================================

export const getSessionStatus = async (req, res) => {
  try {

    const { degreeClassId } = req.query;


    const filter = {};

    if (degreeClassId) {
      filter.degreeClassId = degreeClassId;
    }


    const sessions =
      await Session.find(filter)
        .populate(
          "degreeClassId",
          "name code duration"
        )
        .sort({
          year: 1,
        });


    // Spring before Fall
    sessions.sort((a, b) => {

      if (a.year !== b.year) {
        return a.year - b.year;
      }

      if (a.term === b.term) {
        return 0;
      }

      return a.term === "Spring"
        ? -1
        : 1;
    });


    const currentSession =
      sessions.find(
        (session) => session.isActive
      );


    return res.json({
      success: true,

      data: {
        sessions,

        currentSession:
          currentSession || null,

        totalSessions:
          sessions.length,

        activeSession:
          currentSession?.name || null,
      },
    });

  } catch (err) {
    return res.status(400).json({
      success: false,
      message: cleanError(err),
    });
  }
};


// =========================================================
// DELETE SESSION
// =========================================================

export const deleteSession = async (req, res) => {
  try {

    const session =
      await Session.findByIdAndDelete(
        req.params.id
      );


    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }


    return res.json({
      success: true,
      message: "Session deleted",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};