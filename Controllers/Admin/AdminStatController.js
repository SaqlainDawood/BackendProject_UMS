import Student from "../../Models/StudentModel.js";
import Faculty from "../../Models/TeacherModel.js";
import { sendApprovalEmail } from "../../utils/emailService.js";
import User from '../../Models/userModel.js'
// in the dashboard total students check.
export const getTotalStudents = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalFaculty = await Faculty.countDocuments();
    const pendingApprovals = await Student.countDocuments({
      status: "pending",
    });
   return res.status(200).json({
      success: true,
      totalStudents,
      totalFaculty,
      pendingApprovals,
    });
  } catch (error) {
    console.log("Get total Students Failed....", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// In the studentList page check the total approve rejected students.

export const getStudentsStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: "approved" });
    const suspendStudents = await Student.countDocuments({
      status: "rejected",
    });
    const departments = await Student.distinct("enrollment.department");
    const totalDepartments = departments.length;
    res.json({
      success: true,
      totalStudents,
      activeStudents,
      suspendStudents,
      departments: totalDepartments,
    });
  } catch (error) {
    console.log("Get Students Statistics Error", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// In the admin page Pending Students.....
export const getPendingStudents = async (req, res) => {
  try {
    const pendingStudents = await Student.find({ status: "pending" })
    .populate("user" , "email")
    .select("-password");
    res.status(200).json(pendingStudents);
    console.log("Pending Students Found:", pendingStudents.length);
  } catch (error) {
    console.log("Error in fetching Pending Students", error);
    res.status(500).json({
      success: false,
      message: "Error Fetching Pending Students.",
      error,
    });
  }
};
// Admin Approve Students

export const approveStudents = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    ).populate("user", "email");

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student not found",
      });
    }

    const email = student.email || student.user?.email;

    const studentDataForEmail = {
      studentName: `${student.firstName} ${student.lastName}`,
      program: student.enrollment?.program,
      department: student.enrollment?.department,
      semester: student.enrollment?.semester,
      email: email,
    };

   console.log("🔥 Calling Email Function...");

sendApprovalEmail(studentDataForEmail)
  .then(() => console.log("✅ Email sent successfully"))
  .catch(err => console.log(" Email failed:", err));
    res.status(200).json({
      success: true,
      message: "Student Approved Successfully",
      student,
    });

  } catch (error) {
    console.log("Approve Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// In the admin page rejected Students.
export const rejectStudent = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason },
      { new: true }
    );
    res.status(200).json({
      success: true,
      message: "Student Rejected Successfully",
      student,
    });
  } catch (error) {
    console.log("Rejected Student Error ", error);
    res.status(500).json({
      success: false,
      message: error.message || "Error becomes in rejected students",
    });
  }
};

// Admin Assign Roll Number of the students
// Unassign Roll Number
export const getUnassignRollStd = async (req, res) => {
  try {
    console.log("Fetch Unassign Students Roll No.");
    const Students = await Student.find({
      status: { $in: ["approved", "unassigned"] },
      $or: [{ rollNo: null }, { rollNo: "" }],
    })
      .populate("user" , "email")
      .select("-password")
      .lean();
    console.log(`Found ${Students.length} unassign students`);
    res.json({
      success: true,
      count: Students.length,
      Students,
    });
  } catch (error) {
    console.log("error in getting unassign roll students", error);
    res
      .status(500)
      .json({
        success: false,
        message: "server error in fetching unassign roll no sutdents",
      });
  }
};
export const assignRollNoStd = async (req, res) => {
  try {
    const { assignedStudents } = req.body;
    if (!assignedStudents || assignedStudents.length === 0) {
      return res.status(400).json({ message: "No students provided" });
    }
    for (let item of assignedStudents) {
      await Student.findByIdAndUpdate(item._id, {
        rollNo: item.rollNo,
        registrationNo: item.registrationNo,
        section:item.section,
        status: "Active",
      });
    }

    res.status(200).json({ message: "Roll & Registration Numbers Assigned!" });
  } catch (error) {
    console.log("Error Assigning the roll number to studens", error);
    res.status(500).json({
      success: false,
      message: "Error assigning Roll Number to students.....",
    });
  }
};
