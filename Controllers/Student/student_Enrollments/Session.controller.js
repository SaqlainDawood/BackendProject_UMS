
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

  return (
    err.message ||
    "Something went wrong"
  );
}

/* =========================================================
   GENERATE SPRING + FALL
========================================================= */

export const generateSessionsForDegreeClass =
  async (req, res) => {
    try {
      const {
        degreeClassId,
        springStartDate,
        semesterMonths,
      } = req.body;

      if (
        !degreeClassId ||
        !springStartDate ||
        !semesterMonths
      ) {
        return res.status(400).json({
          success: false,
          message:
            "degreeClassId, springStartDate and semesterMonths are required",
        });
      }

      const degreeClass =
        await DegreeClass.findById(
          degreeClassId
        );

      if (!degreeClass) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid degreeClassId",
        });
      }

      const months =
        Number(semesterMonths);

      if (
        !Number.isInteger(months) ||
        months <= 0 ||
        months > 12
      ) {
        return res.status(400).json({
          success: false,
          message:
            "semesterMonths must be a valid number between 1 and 12",
        });
      }

      const springStart =
        new Date(springStartDate);

      if (
        Number.isNaN(
          springStart.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid springStartDate",
        });
      }

      const created = [];
      const skipped = [];

      /* =====================================================
         SPRING
      ===================================================== */

      const springEnd =
        new Date(springStart);

      springEnd.setMonth(
        springEnd.getMonth() + months
      );

      springEnd.setDate(
        springEnd.getDate() - 1
      );

      const springYear =
        springStart.getFullYear();

      const springName =
        `Spring ${springYear}`;

      const existingSpring =
        await Session.findOne({
          $or: [
            {
              name: springName,
            },
            {
              term: "Spring",
              year: springYear,
            },
          ],
        });

      let springSession =
        existingSpring;

      if (existingSpring) {
        skipped.push(
          existingSpring.name
        );
      } else {
        springSession =
          await Session.create({
            name: springName,
            term: "Spring",
            year: springYear,
            startDate: springStart,
            endDate: springEnd,
            isActive: false,
          });

        created.push(
          springSession
        );
      }

      /* =====================================================
         FALL
         Spring ke immediately baad.
         Vacation yahan calculate nahi ho rahi.
      ===================================================== */

      const fallStart =
        new Date(springEnd);

      fallStart.setDate(
        fallStart.getDate() + 1
      );

      const fallEnd =
        new Date(fallStart);

      fallEnd.setMonth(
        fallEnd.getMonth() + months
      );

      fallEnd.setDate(
        fallEnd.getDate() - 1
      );

      const fallYear =
        fallStart.getFullYear();

      const fallName =
        `Fall ${fallYear}`;

      const existingFall =
        await Session.findOne({
          $or: [
            {
              name: fallName,
            },
            {
              term: "Fall",
              year: fallYear,
            },
          ],
        });

      let fallSession =
        existingFall;

      if (existingFall) {
        skipped.push(
          existingFall.name
        );
      } else {
        fallSession =
          await Session.create({
            name: fallName,
            term: "Fall",
            year: fallYear,
            startDate: fallStart,
            endDate: fallEnd,
            isActive: false,
          });

        created.push(
          fallSession
        );
      }

      return res.status(201).json({
        success: true,

        message:
          `${created.length} session(s) created, ${skipped.length} skipped`,

        data: {
          created,
          skipped,
          spring:
            springSession,
          fall:
            fallSession,
          fallEndDate:
            fallEnd,
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

export const createSession =
  async (req, res) => {
    try {
      const {
        name,
        term,
        year,
        startDate,
        endDate,
        isActive,
      } = req.body;

      if (
        !name ||
        !term ||
        !year ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "name, term, year, startDate and endDate are required",
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

      const session =
        await Session.create({
          name,
          term,
          year,
          startDate,
          endDate,
          isActive:
            Boolean(isActive),
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

export const getSessions =
  async (req, res) => {
    try {
      const {
        term,
        year,
      } = req.query;

      const filter = {};

      if (term) {
        filter.term = term;
      }

      if (year) {
        filter.year = Number(year);
      }

      const sessions =
        await Session.find(filter)
          .sort({
            startDate: 1,
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

export const getCurrentSession =
  async (req, res) => {
    try {
      const session =
        await Session.findOne({
          isActive: true,
        });

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "No active session set",
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
   GET SINGLE
========================================================= */

export const getSessionById =
  async (req, res) => {
    try {
      const session =
        await Session.findById(
          req.params.id
        );

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found",
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
   UPDATE
========================================================= */

export const updateSession =
  async (req, res) => {
    try {
      const { isActive } =
        req.body;

      if (isActive) {
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
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found",
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

export const getSessionStatus =
  async (req, res) => {
    try {
      const sessions =
        await Session.find()
          .sort({
            startDate: 1,
          });

      const today = new Date();

      const withStatus =
        sessions.map((session) => {
          let status;

          if (
            today >
            session.endDate
          ) {
            status = "completed";
          } else if (
            today >=
              session.startDate &&
            today <=
              session.endDate
          ) {
            status = "ongoing";
          } else {
            status = "upcoming";
          }

          return {
            ...session.toObject(),
            status,
          };
        });

      const lastSession =
        sessions.length
          ? sessions[
              sessions.length - 1
            ]
          : null;

      const isLastCompleted =
        lastSession
          ? today >
            lastSession.endDate
          : true;

      const hasUpcoming =
        withStatus.some(
          (session) =>
            session.status ===
            "upcoming"
        );

      return res.json({
        success: true,

        data: {
          sessions:
            withStatus,

          completedCount:
            withStatus.filter(
              (s) =>
                s.status ===
                "completed"
            ).length,

          ongoingCount:
            withStatus.filter(
              (s) =>
                s.status ===
                "ongoing"
            ).length,

          upcomingCount:
            withStatus.filter(
              (s) =>
                s.status ===
                "upcoming"
            ).length,

          needsNextSession:
            isLastCompleted &&
            !hasUpcoming,

          lastSession,
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
   DELETE
========================================================= */

export const deleteSession =
  async (req, res) => {
    try {
      const session =
        await Session.findByIdAndDelete(
          req.params.id
        );

      if (!session) {
        return res.status(404).json({
          success: false,
          message:
            "Session not found",
        });
      }

      return res.json({
        success: true,
        message:
          "Session deleted",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: cleanError(err),
      });
    }
  };