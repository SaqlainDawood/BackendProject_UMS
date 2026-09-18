import DegreeClass from "../../../Models/Degreeclass.js";
import Department from "../../../Models/Department.js";

// Program configuration
const programConfig = {
  ADP: {
    duration: 2,
    startSemester: 1,
    endSemester: 4,
  },

  POST_ADP: {
    duration: 2,
    startSemester: 5,
    endSemester: 8,
  },

  BS: {
    duration: 4,
    startSemester: 1,
    endSemester: 8,
  },
};

// CREATE
export const createDegreeClass = async (req, res) => {
  try {
    const { name, code, departmentId, programType } = req.body;

    // Validate program type
    const config = programConfig[programType];

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "Invalid programType. Use ADP, POST_ADP or BS",
      });
    }

    // Check department
    const departmentExists = await Department.findById(departmentId);

    if (!departmentExists) {
      return res.status(400).json({
        success: false,
        message: "Invalid departmentId",
      });
    }

    // Automatically calculate duration and semesters
    const degreeClass = await DegreeClass.create({
      name,
      code,
      departmentId,
      programType,
      duration: config.duration,
      startSemester: config.startSemester,
      endSemester: config.endSemester,
    });

    res.status(201).json({
      success: true,
      data: degreeClass,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This code already exists under this department",
      });
    }

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// READ - all
export const getDegreeClasses = async (req, res) => {
  try {
    const { departmentId } = req.query;

    const filter = {};

    if (departmentId) {
      filter.departmentId = departmentId;
    }

    const degreeClasses = await DegreeClass.find(filter)
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: degreeClasses,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// READ - single
export const getDegreeClassById = async (req, res) => {
  try {
    const degreeClass = await DegreeClass.findById(req.params.id)
      .populate("departmentId", "name code");

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      data: degreeClass,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// UPDATE
export const updateDegreeClass = async (req, res) => {
  try {
    const { departmentId, programType } = req.body;

    // Check department if provided
    if (departmentId) {
      const departmentExists = await Department.findById(departmentId);

      if (!departmentExists) {
        return res.status(400).json({
          success: false,
          message: "Invalid departmentId",
        });
      }
    }

    // Get existing DegreeClass
    const existingDegreeClass = await DegreeClass.findById(req.params.id);

    if (!existingDegreeClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // If programType is being updated,
    // automatically update duration and semesters
    let updateData = {
      ...req.body,
    };

    if (programType) {
      const config = programConfig[programType];

      if (!config) {
        return res.status(400).json({
          success: false,
          message: "Invalid programType. Use ADP, POST_ADP or BS",
        });
      }

      updateData.duration = config.duration;
      updateData.startSemester = config.startSemester;
      updateData.endSemester = config.endSemester;
    }

    const degreeClass = await DegreeClass.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    res.json({
      success: true,
      data: degreeClass,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This code already exists under this department",
      });
    }

    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE
export const deleteDegreeClass = async (req, res) => {
  try {
    const degreeClass = await DegreeClass.findByIdAndDelete(req.params.id);

    if (!degreeClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      message: "Class deleted",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};