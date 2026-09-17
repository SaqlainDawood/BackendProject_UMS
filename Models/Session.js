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
  {
    timestamps: true,
  }
);
sessionSchema.index(
  {
    degreeClassId: 1,
    term: 1,
    year: 1,
  },
  {
    unique: true,
    name: "unique_degree_class_session",
  }
);

const Session =
  mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);

export default Session;