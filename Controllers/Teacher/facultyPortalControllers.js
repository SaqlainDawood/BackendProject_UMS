import User from "../../Models/userModel.js";
import Faculty from "../../Models/TeacherModel.js";
export const fetchFacultyProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.faculty._id).populate(
      "user",
      "email role lasLogin"
    );
    if (!faculty) {
      return res.status(404).json({
        success: false,
        mesasge: "User not found",
      });
    }
    res.json({
      success: true,
      faculty: faculty,
    });
  } catch (error) {
    console.log("Error for fetching the faculty Profile.", error);
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
