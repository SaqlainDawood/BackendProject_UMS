import mongoose from "mongoose";
const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    degreeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DegreeClass",
      required: true,
    },

    creditHours: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
      default: 3,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


subjectSchema.index({
  degreeClassId: 1,
});

subjectSchema.index({
  code: 1,
});

subjectSchema.index(
  {
    degreeClassId: 1,
    code: 1,
  },
  {
    unique: true,
  }
);

const Subject =
  mongoose.models.Subject ||
  mongoose.model("Subject", subjectSchema);

export default Subject;