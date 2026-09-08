import mongoose from "mongoose";
import DegreeClass from "./DegreeClass.js";

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },

    code: {
      type: String,
      required: [true, "Subject code is required"],
      uppercase: true,
      trim: true,
    },

    degreeClassId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DegreeClass",
      required: [true, "Degree class is required"],

      // Check DegreeClass exists in database
      validate: {
        validator: async function (value) {
          const exists = await DegreeClass.exists({
            _id: value,
          });

          return !!exists;
        },
        message: "Selected degree class does not exist",
      },
    },

    creditHours: {
      type: Number,
      required: [true, "Credit hours are required"],
      min: [1, "Credit hours must be at least 1"],
      max: [6, "Credit hours cannot be greater than 6"],
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


// ==========================================
// INDEXES
// ==========================================

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