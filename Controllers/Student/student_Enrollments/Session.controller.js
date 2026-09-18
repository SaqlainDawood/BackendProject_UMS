import Session from "../../../Models/Session.js";
import DegreeClass from "../../../Models/Degreeclass.js";
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
function getSessionInfo(startYear, startTerm, offset) {
  let term;
  let year;

  if (startTerm === "Fall") {
    if (offset % 2 === 0) {
      term = "Fall";
      year = startYear + offset / 2;
    } else {
      term = "Spring";
      year = startYear + Math.ceil(offset / 2);
    }
  } else {
    if (offset % 2 === 0) {
      term = "Spring";
      year = startYear + offset / 2;
    } else {
      term = "Fall";
      year = startYear + Math.floor(offset / 2);
    }
  }

  return {
    term,
    year,
    name: `${term} ${year}`,
  };
}

export const generateSessionsForDegreeClass = async (req, res) => {
  try {
    const {
      degreeClassId,
      startYear,
      startTerm,
    } = req.body;

    if (
      !degreeClassId ||
      startYear === undefined ||
      !startTerm
    ) {
      return res.status(400).json({
        success: false,
        message:
          "degreeClassId, startYear and startTerm are required",
      });
    }

    const year = Number(startYear);

    if (!Number.isInteger(year) || year < 2000) {
      return res.status(400).json({
        success: false,
        message: "startYear must be a valid year",
      });
    }

    if (!["Fall", "Spring"].includes(startTerm)) {
      return res.status(400).json({
        success: false,
        message:
          "startTerm must be either Fall or Spring",
      });
    }
    const degreeClass =
      await DegreeClass.findById(degreeClassId);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Degree Class not found",
      });
    }
    const startSemester = Number(
      degreeClass.startSemester
    );
    const endSemester = Number(
      degreeClass.endSemester
    );

    if (
      !Number.isInteger(startSemester) ||
      !Number.isInteger(endSemester)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Degree Class has invalid startSemester or endSemester",
      });
    }

    if (startSemester > endSemester) {
      return res.status(400).json({
        success: false,
        message:
          "Degree Class startSemester cannot be greater than endSemester",
      });
    }
    const created = [];
    const skipped = [];
    for (
      let semester = startSemester;
      semester <= endSemester;
      semester++
    ) {
      // 0-based position
      const offset = semester - startSemester;
      const {
        term,
        year: sessionYear,
        name: sessionName,
      } = getSessionInfo(
        year,
        startTerm,
        offset
      );
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
          term: existingSession.term,
          year: existingSession.year,
        });

        continue;
      }

  
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
          programType: degreeClass.programType,
          duration: degreeClass.duration,
          startSemester: startSemester,
          endSemester: endSemester,
        },

        startSession: `${startTerm} ${year}`,

        totalSemesters:
          endSemester - startSemester + 1,

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
          "name code programType duration startSemester endSemester"
        )
        .sort({
          year: 1,
        });
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
      }).populate(
        "degreeClassId",
        "name code programType duration startSemester endSemester"
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
export const getSessionById = async (req, res) => {
  try {
    const session =
      await Session.findById(req.params.id)
        .populate(
          "degreeClassId",
          "name code programType duration startSemester endSemester"
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
    if (
      term !== undefined &&
      !["Fall", "Spring"].includes(term)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "term must be either Fall or Spring",
      });
    }
    const updateData = {};
    if (degreeClassId !== undefined) {
      updateData.degreeClassId =
        degreeClassId;
    }
    if (name !== undefined) {
      updateData.name = name;
    }
    if (term !== undefined) {
      updateData.term = term;
    }
    if (year !== undefined) {
      const numericYear = Number(year);
      if (
        !Number.isInteger(numericYear) ||
        numericYear < 2000
      ) {
        return res.status(400).json({
          success: false,
          message: "year must be a valid year",
        });
      }
      updateData.year = numericYear;
    }
    if (isActive !== undefined) {
      updateData.isActive =
        Boolean(isActive);
    }
    if (isActive === true) {
      const activeDegreeClassId =
        degreeClassId ||
        existingSession.degreeClassId;

      await Session.updateMany(
        {
          degreeClassId:
            activeDegreeClassId,
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
      ).populate(
        "degreeClassId",
        "name code programType duration startSemester endSemester"
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
          "name code programType duration startSemester endSemester"
        )
        .sort({
          year: 1,
        });
    sessions.sort((a, b) => {
      if (a.year !== b.year) {
        return a.year - b.year;
      }

      if (a.term === b.term) {
        return 0;
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
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};
export const deleteSessionsByDegreeClass = async (
  req,
  res
) => {
  try {
    const { degreeClassId } = req.params;

    if (!degreeClassId) {
      return res.status(400).json({
        success: false,
        message: "degreeClassId is required",
      });
    }
    const degreeClass =
      await DegreeClass.findById(
        degreeClassId
      );

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Degree Class not found",
      });
    }
    const result =
      await Session.deleteMany({
        degreeClassId:
          degreeClass._id,
      });

    return res.json({
      success: true,

      message:
        `${result.deletedCount} session(s) deleted successfully`,

      data: {
        degreeClass: {
          id: degreeClass._id,
          name: degreeClass.name,
          code: degreeClass.code,
          programType:
            degreeClass.programType,
        },

        deletedCount:
          result.deletedCount,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: cleanError(err),
    });
  }
};