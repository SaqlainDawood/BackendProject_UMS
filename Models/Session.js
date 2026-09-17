import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    degreeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DegreeClass",
      required: true,
      index: true,
    },

    term: {
      type: String,
      enum: ["Fall", "Spring"],
      required: true,
    },

    year: {
      type: Number,
      required: true,
      min: 2000,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/*
  Same DegreeClass mein:
  Spring 2026 = one session
  Fall 2026   = one session

  Lekin different DegreeClass ke liye
  Spring 2026 alag session ho sakta hai.
*/
sessionSchema.index(
  {
    degreeClassId: 1,
    term: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

const Session =
  mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);

export default Session;