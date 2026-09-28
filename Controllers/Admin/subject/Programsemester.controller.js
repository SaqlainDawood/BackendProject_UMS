import ProgramSemester from "../../../Models/Programsemester.js";
export const createProgramSemester = async (req, res) => {
  try {
    const { degreeClassId, semesterNo, name } = req.body;

    if (!degreeClassId || !semesterNo) {
      return res.status(400).json({
        success: false,
        message: "degreeClassId aur semesterNo required hain",
      });
    }

    const programSemester = await ProgramSemester.create({ degreeClassId, semesterNo, name });
    return res.status(201).json({ success: true, data: programSemester });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ye semester is degreeClass ke liye pehle se bana hua hai",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSemestersByDegreeClass = async (req, res) => {
  try {
    const { degreeClassId } = req.params;
    const semesters = await ProgramSemester.find({ degreeClassId, isActive: true }).sort({
      semesterNo: 1,
    });
    return res.status(200).json({ success: true, count: semesters.length, data: semesters });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProgramSemester = async (req, res) => {
  try {
    const semester = await ProgramSemester.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!semester) {
      return res.status(404).json({ success: false, message: "ProgramSemester nahi mila" });
    }
    return res.status(200).json({ success: true, data: semester });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deactivateProgramSemester = async (req, res) => {
  try {
    const semester = await ProgramSemester.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!semester) {
      return res.status(404).json({ success: false, message: "ProgramSemester nahi mila" });
    }
    return res.status(200).json({ success: true, message: "Semester deactivate ho gaya" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};