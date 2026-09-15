import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

sessionSchema.index(
  { term: 1, year: 1 },
  { unique: true }
);

const Session =
  mongoose.models.Session ||
  mongoose.model("Session", sessionSchema);

export default Session;