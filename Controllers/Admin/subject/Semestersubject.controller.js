import SemesterSubject from "../../../Models/Semestersubject.js";

export const addSubjectToSemester = async (req, res) => {
  try {
    const { programSemesterId, subjectId, creditHours, subjectType } = req.body;

    if (!programSemesterId || !subjectId || !creditHours) {
      return res.status(400).json({
        success: false,
        message: "programSemesterId, subjectId aur creditHours required hain",
      });
    }

    const semesterSubject = await SemesterSubject.create({
      programSemesterId,
      subjectId,
      creditHours,
      subjectType,
    });

    return res.status(201).json({ success: true, data: semesterSubject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ye subject is semester mein pehle se add hai",
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSubjectsBySemester = async (req, res) => {
  try {
    const { programSemesterId } = req.params;
    const semesterSubjects = await SemesterSubject.find({
      programSemesterId,
      isActive: true,
    }).populate("subjectId", "name code creditHours prerequisites");

    return res
      .status(200)
      .json({ success: true, count: semesterSubjects.length, data: semesterSubjects });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSemesterSubject = async (req, res) => {
  try {
    const semesterSubject = await SemesterSubject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!semesterSubject) {
      return res.status(404).json({ success: false, message: "SemesterSubject nahi mila" });
    }
    return res.status(200).json({ success: true, data: semesterSubject });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const removeSemesterSubject = async (req, res) => {
  try {
    const semesterSubject = await SemesterSubject.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!semesterSubject) {
      return res.status(404).json({ success: false, message: "SemesterSubject nahi mila" });
    }
    return res.status(200).json({ success: true, message: "Subject semester se hata diya gaya" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};