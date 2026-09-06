import Student from "../../Models/StudentModel.js";
import Faculty from "../../Models/TeacherModel.js";
import { sendApprovalEmail } from "../../utils/emailService.js";
import User from '../../Models/userModel.js'
import Batch from "../../Models/Batch.js";
import Enrollment from "../../Models/Enrollment.js";
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
  console.log(" Approve Students API called for ID:", req.params.id);

  try {
    const existingStudent = await Student.findById(req.params.id);

    if (!existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student not found",
      });
    }

    if (!existingStudent.degreeClassId || !existingStudent.shiftId) {
      return res.status(400).json({
        success: false,
        message:
          "This student has not completed Step 4 (degree class / shift) yet, cannot approve.",
      });
    }

    /*
      Batch was NEVER selected by the student during enrollment (Step 4).
      At approval time, find the appropriate active Batch that matches
      the student's chosen degreeClassId + shiftId — same DegreeClass -> Shift -> Batch
      relationship the Batch API already follows. The most recently
      created active batch for that class+shift is used (i.e. the batch
      for the current intake).
    */
    const matchingBatch = await Batch.findOne({
      degreeClassId: existingStudent.degreeClassId,
      shiftId: existingStudent.shiftId,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .populate("startSessionId", "name");

    if (!matchingBatch) {
      return res.status(400).json({
        success: false,
        message:
          "No active batch found for this student's degree class and shift. Please create a batch first.",
      });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        status: "approved",
        batchId: matchingBatch._id,
        "enrollment.semester": String(matchingBatch.currentSemester),
        "enrollment.session": matchingBatch.startSessionId?.name || "",
      },
      { new: true }
    ).populate("user", "email");

    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student not found",
      });
    }

    // Real Enrollment record — created only now, since the Batch is only
    // known at approval time (upsert so re-approving doesn't throw a
    // duplicate-key error).
    await Enrollment.findOneAndUpdate(
      { studentId: student._id, batchId: matchingBatch._id },
      {
        $setOnInsert: {
          studentId: student._id,
          batchId: matchingBatch._id,
          status: "active",
        },
      },
      { upsert: true }
    );

    // ===== DEBUG: Log the entire student object to see what's available =====
    console.log(" Full Student Object:");
    console.log("Student ID:", student._id);
    console.log("Student Name:", `${student.firstName} ${student.lastName}`);
    console.log("Student.email field:", student.email);
    console.log("Student.user:", student.user);
    console.log("Student.user?.email:", student.user?.email);
    console.log("Student.user?.email (full):", JSON.stringify(student.user));
    console.log("Student.enrollment:", student.enrollment);
    // =====================================================================

    // Try multiple ways to get the email
    let email = null;
    
    // Method 1: Direct email field
    if (student.email) {
      email = student.email;
      console.log(" Found email via student.email:", email);
    }
    // Method 2: From populated user object
    else if (student.user && student.user.email) {
      email = student.user.email;
      console.log(" Found email via student.user.email:", email);
    }
    // Method 3: From user object that might not be populated (string ID)
    else if (student.user && typeof student.user === 'string') {
      console.log(" User is not populated. Need to fetch manually...");
      const user = await User.findById(student.user).select("email");
      if (user && user.email) {
        email = user.email;
        console.log(" Found email via manual user lookup:", email);
      }
    }
    
    if (!email) {
      console.log(" CRITICAL: No email found for student!");
      console.log("Student data:", {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        hasUserField: !!student.user,
        userType: typeof student.user
      });
    }
    
    const studentDataForEmail = {
      studentName: `${student.firstName} ${student.lastName}`,
      program: student.enrollment?.program || student.program || "Not specified",
      department: student.enrollment?.department || student.department || "Not specified",
      semester: student.enrollment?.semester || student.semester || "Not specified",
      email: email,
    };

    // Send email using Brevo API
    let emailResult = { success: false, error: "No email provided" };
    
    if (email) {
      console.log(" Sending approval email via Brevo API to:", email);
      emailResult = await sendApprovalEmail(studentDataForEmail);
      
      if (emailResult.success) {
        console.log(" Email sent successfully to:", email);
      } else {
        console.log(" Email failed:", emailResult.error);
      }
    } else {
      console.log(" No email found for student - email not sent");
      
      // Log to database for tracking (optional)
      await Student.findByIdAndUpdate(req.params.id, {
        $set: { emailNotificationFailed: true, emailNotificationReason: "No email address found" }
      });
    }

    res.status(200).json({
      success: true,
      message: "Student Approved Successfully",
      emailSent: emailResult.success,
      emailMessageId: emailResult.messageId,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: email || "Not found",
        status: student.status,
        batchId: student.batchId,
        degreeClassId: student.degreeClassId,
        shiftId: student.shiftId,
        enrollment: student.enrollment,
      },
    });

  } catch (error) {
    console.error(" Approve Error:", error);
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