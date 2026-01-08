import Student from '../../Models/StudentModel.js';

export const getAllStudentList = async (req, res) => {
  try {
    const allStudents = await Student.find()
      .populate("user", "email")
      .sort({ createdAt: -1 });

    console.log("ALL STUDENTS IN DATABASE:");
    allStudents.forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.firstName} ${student.lastName} - Status: ${
          student.status
        } Email: ${student.user?.email || "NO USER EMAIL"}`
      );
    });

    const allowedStatuses = [
      "approved",
      "unassigned",
      "assign",
      "rejected",
      "Active",
      "Suspend",
    ];

    const students = await Student.find({
      status: { $in: allowedStatuses },
    })
      .populate("user", "email")
      .sort({ createdAt: -1 });

    // FIXED CONDITION
    if (!students || students.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No students found with the specified statuses",
      });
    }

    console.log("✅ Filtered students count:", students.length);
    console.log("✅ Allowed statuses:", allowedStatuses);

    students.forEach((student, index) => {
      console.log(
        `${index + 1}. ${student.firstName} ${student.lastName} - ${student.rollNo} - ${
          student.enrollment?.department
        } - ${student.status} - ${student.user?.email || "NO USER EMAIL"}`
      );
    });

    res.status(200).json({
      success: true,
      count: students.length,
      message: "Student Record fetched Successfully",
      students: students,
    });
  } catch (error) {
    console.log("Error in fetch student record", error);
    res.status(500).json({
      success: false,
      message: "Error in fetching student Record",
    });
  }
};
