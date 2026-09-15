import Session from "../../../Models/Session.js";
import DegreeClass from "../../../Models/Degreeclass.js";

function cleanError(err) {
  if (err.name === "CastError") {
    return `Invalid ${err.path} — please provide a valid ID`;
  }

  if (err.code === 11000) {
    return "This session already exists";
  }

  if (err.name === "ValidationError") {
    return Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  return err.message || "Something went wrong";
}

/* =========================================================
   GENERATE SESSIONS FOR DEGREE CLASS
   Spring -> Fall -> Spring -> Fall...
   
   Example:
   4 Years = 8 Semesters

   Spring 2026
   Fall 2026
   Spring 2027
   Fall 2027
   Spring 2028
   Fall 2028
   Spring 2029
   Fall 2029
========================================================= */

export const generateSessionsForDegreeClass = async (
  req,
  res
) => {
  try {
    const { degreeClassId, startYear } = req.body;

    if (!degreeClassId || !startYear) {
      return res.status(400).json({
        success: false,
        message:
          "degreeClassId and startYear are required",
      });
    }

    const year = Number(startYear);

    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        success: false,
        message: "startYear must be a valid year",
      });
    }

    // Get Degree Class
    const degreeClass =
      await DegreeClass.findById(degreeClassId);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Degree Class not found",
      });
    }

    // Duration required
    if (
      !degreeClass.duration ||
      degreeClass.duration <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Degree Class duration is required to generate sessions",
      });
    }

    // 1 year = 2 semesters
    const totalSemesters =
      Number(degreeClass.duration) * 2;

    const created = [];
    const skipped = [];

    /*
      Starting session is ALWAYS Spring.

      Semester 1 -> Spring
      Semester 2 -> Fall
      Semester 3 -> Spring
      Semester 4 -> Fall
    */

    for (
      let semester = 1;
      semester <= totalSemesters;
      semester++
    ) {
      const term =
        semester % 2 === 1
          ? "Spring"
          : "Fall";

      /*
        Semester 1 -> startYear
        Semester 2 -> startYear
        Semester 3 -> startYear + 1
        Semester 4 -> startYear + 1
      */

      const sessionYear =
        year + Math.floor((semester - 1) / 2);

      const sessionName =
        `${term} ${sessionYear}`;

      // Check existing session
      const existingSession =
        await Session.findOne({
          term,
          year: sessionYear,
        });

      if (existingSession) {
        skipped.push(existingSession.name);
        continue;
      }

      const session = await Session.create({
        name: sessionName,
        term,
        year: sessionYear,
        isActive: false,
      });

      created.push(session);
    }

    return res.status(201).json({
      success: true,
      message:
        `${created.length} session(s) created, ${skipped.length} skipped`,
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

/* =========================================================
   CREATE SINGLE SESSION
========================================================= */

export const createSession = async (req, res) => {
  try {
    const {
      name,
      term,
      year,
      isActive,
    } = req.body;

    if (!name || !term || !year) {
      return res.status(400).json({
        success: false,
        message:
          "name, term and year are required",
      });
    }

    if (isActive) {
      await Session.updateMany(
        {},
        {
          $set: {
            isActive: false,
          },
        }
      );
    }

    const session = await Session.create({
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

/* =========================================================
   GET ALL SESSIONS
========================================================= */

export const getSessions = async (req, res) => {
  try {
    const { term, year } = req.query;

    const filter = {};

    if (term) {
      filter.term = term;
    }

    if (year) {
      filter.year = Number(year);
    }

    const sessions = await Session.find(filter)
      .sort({
        year: 1,
        term: 1,
      });

    /*
      Custom sorting:
      Spring first
      Fall second
    */

    sessions.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }

      if (a.term === b.term) {
        return 0;
      }

      return a.term === "Spring" ? -1 : 1;
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

/* =========================================================
   CURRENT ACTIVE SESSION
========================================================= */

export const getCurrentSession = async (
  req,
  res
) => {
  try {
    const session =
      await Session.findOne({
        isActive: true,
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "No active session set",
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

/* =========================================================
   GET SINGLE SESSION
========================================================= */

export const getSessionById = async (
  req,
  res
) => {
  try {
    const session =
      await Session.findById(req.params.id);

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

/* =========================================================
   UPDATE SESSION
========================================================= */

export const updateSession = async (
  req,
  res
) => {
  try {
    const {
      name,
      term,
      year,
      isActive,
    } = req.body;

    // Only allowed fields update honge
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (term !== undefined) {
      updateData.term = term;
    }

    if (year !== undefined) {
      updateData.year = year;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    // If this session becomes active,
    // all other sessions become inactive
    if (isActive === true) {
      await Session.updateMany(
        {
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
    return res.status(400).json({
      success: false,
      message: cleanError(err),
    });
  }
};

/* =========================================================
   SESSION STATUS
========================================================= */

export const getSessionStatus = async (
  req,
  res
) => {
  try {
    const sessions = await Session.find()
      .sort({
        year: 1,
      });

    // Spring before Fall
    sessions.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }

      return a.term === "Spring" ? -1 : 1;
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

/* =========================================================
   DELETE SESSION
========================================================= */

export const deleteSession = async (
  req,
  res
) => {
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