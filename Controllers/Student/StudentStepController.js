// Controllers/Student/StudentStepController.js
import mongoose from "mongoose";
import Student from "../../Models/StudentModel.js";
import User from "../../Models/UserModel.js";
import cloudinary from "../../Cloudinary/CloudConnect.js";
import DegreeClass from "../../Models/Degreeclass.js";
import Shift from "../../Models/Shift.js";
import Department from "../../Models/Department.js";
import Campus from "../../Models/Campus.js";

/* ============================================================
   HELPERS
   ============================================================ */
const allowedImageMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const cleanupFile = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("File cleanup error:", err);
    }
  }
};

/* ============================================================
   SAVE STEP
   POST /api/students/step/:step
   Protected (protectStudent)
   ============================================================ */
export const saveStudentStep = async (req, res) => {
  let session = null;
  const uploadedFiles = [];

  try {
    const step = parseInt(req.params.step);
    const stepData = { ...req.body };

    if (![1, 2, 3, 4].includes(step)) {
      return res.status(400).json({
        success: false,
        message: "Invalid step. Allowed: 1-4",
      });
    }

    // ✅ Token se student lo
    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.status === "approved" || student.status === "active") {
      return res.status(400).json({
        success: false,
        message: "Application already approved. Cannot edit.",
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    /* ============================================================
       STEP 1: PERSONAL INFO
       ============================================================ */
    if (step === 1) {
      if (req.file) {
        if (!allowedImageMimeTypes.includes(req.file.mimetype)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Only JPG, PNG, WEBP images allowed",
          });
        }
        uploadedFiles.push({
          public_id: req.file.filename,
          url: req.file.path,
          type: "profile",
        });
        stepData.profileImage = {
          url: req.file.path,
          public_id: req.file.filename,
        };
      }

      // Required fields check
      if (!stepData.firstName || !stepData.lastName || !stepData.cnic || !stepData.phoneNo) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "firstName, lastName, cnic, phoneNo are required",
        });
      }

      Object.assign(student, {
        firstName: stepData.firstName,
        lastName: stepData.lastName,
        cnic: stepData.cnic,
        phoneNo: stepData.phoneNo,
        presentAddress: stepData.presentAddress || "",
        permanentAddress: stepData.permanentAddress || "",
        religion: stepData.religion || "",
        gender: stepData.gender || "",
        bloodGroup: stepData.bloodGroup || "",
        maritalStatus: stepData.maritalStatus || "",
        nationality: stepData.nationality || "",
        DOB: stepData.DOB ? new Date(stepData.DOB) : undefined,
        province: stepData.province || "",
        domicile: stepData.domicile || "",
        profileImage: stepData.profileImage || student.profileImage,
      });

      student.lastStepCompleted = 1;
    }

    /* ============================================================
       STEP 2: FAMILY
       ============================================================ */
    else if (step === 2) {
      if (!stepData.fatherName) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "fatherName is required",
        });
      }

      student.family = {
        fatherName: stepData.fatherName,
        motherName: stepData.motherName || "",
        fatherCnic: stepData.fatherCnic || "",
        fatherMobile: stepData.fatherMobile || "",
      };

      student.lastStepCompleted = 2;
    }

    /* ============================================================
       STEP 3: EDUCATION (array + files)
       ============================================================ */
    else if (step === 3) {
      let educationList = [];
      try {
        if (typeof stepData.educationList === "string") {
          educationList = JSON.parse(stepData.educationList);
        } else {
          educationList = stepData.educationList;
        }
        if (!Array.isArray(educationList)) {
          throw new Error("Education list must be an array");
        }
      } catch (err) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid education list format",
        });
      }

      if (educationList.length === 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "At least one education record required",
        });
      }

      // Files
      const filesMap = {};
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        req.files.forEach((file) => {
          if (!file || !file.fieldname) return;

          if (!allowedDocumentMimeTypes.includes(file.mimetype)) {
            throw new Error("Only PDF, DOC, DOCX files allowed for marksheets");
          }

          uploadedFiles.push({
            public_id: file.filename,
            url: file.path,
            type: "marksheet",
          });

          const match = file.fieldname.match(/marksheet_(\d+)/);
          if (match) {
            const index = parseInt(match[1]);
            filesMap[index] = {
              url: file.path,
              public_id: file.filename,
            };
          }
        });
      }

      const finalEducationList = educationList.map((edu, index) => ({
        ...edu,
        totalMarks: edu.totalMarks !== undefined && edu.totalMarks !== "" ? Number(edu.totalMarks) : undefined,
        obtainMarks: edu.obtainMarks !== undefined && edu.obtainMarks !== "" ? Number(edu.obtainMarks) : undefined,
        markSheet: filesMap[index] || edu.markSheet || { url: null, public_id: null },
      }));

      student.academic = { educationList: finalEducationList };

      if (Object.keys(filesMap).length > 0) {
        student.documents = {
          ...(student.documents?.toObject?.() ?? student.documents),
          marksheet: true,
        };
      }

      student.lastStepCompleted = 3;
    }

    /* ============================================================
       STEP 4: ENROLLMENT
       ============================================================ */
    else if (step === 4) {
      const { degreeClassId, shiftId } = stepData;

      if (!mongoose.Types.ObjectId.isValid(degreeClassId)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Invalid degreeClassId" });
      }
      if (!mongoose.Types.ObjectId.isValid(shiftId)) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Invalid shiftId" });
      }

      const [degreeClass, shift] = await Promise.all([
        DegreeClass.findById(degreeClassId).session(session),
        Shift.findById(shiftId).session(session),
      ]);

      if (!degreeClass) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Degree class not found" });
      }
      if (!shift) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Shift not found" });
      }
      if (String(shift.degreeClassId) !== String(degreeClassId)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Selected shift does not belong to selected degree class",
        });
      }

      const departmentId = degreeClass.departmentId?._id || degreeClass.departmentId;
      if (!departmentId) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Could not determine department",
        });
      }

      const department = await Department.findById(departmentId).session(session);
      if (!department) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Department not found" });
      }

      const campusId = department.campusId?._id || department.campusId;
      const campus = campusId ? await Campus.findById(campusId).session(session) : null;

      student.enrollment = {
        program: degreeClass.name || "",
        semester: "",
        session: "",
        department: department.name || "",
        shift: shift.name || "",
        campus: campus?.name || "",
        appliedOn: new Date(),
      };

      student.campusId = campusId || null;
      student.departmentId = departmentId;
      student.degreeClassId = degreeClassId;
      student.shiftId = shiftId;
      student.batchId = null;

      student.lastStepCompleted = 4;
      student.isComplete = true;
      student.status = "pending";
    }

    // Save
    await student.save({ session });

    if (uploadedFiles.length > 0) {
      student.temporaryFiles = uploadedFiles;
      await student.save({ session });
    }

    await session.commitTransaction();

    return res.json({
      success: true,
      message: `Step ${step} saved successfully`,
      studentId: student._id,
      isComplete: student.isComplete,
      lastStepCompleted: student.lastStepCompleted,
      status: student.status,
    });
  } catch (error) {
    if (session) await session.abortTransaction();

    console.error(`Step ${req.params.step} error:`, error);

    if (error.message?.includes("Only PDF, DOC and DOCX")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Duplicate data already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save step",
    });
  } finally {
    if (session) await session.endSession();
  }
};

/* ============================================================
   GET FULL APPLICATION
   GET /api/students/application
   ============================================================ */
export const getStudentApplication = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id)
      .populate("user", "email")
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const { temporaryFiles, ...safe } = student.toObject();

    return res.json({
      success: true,
      student: safe,
      lastStepCompleted: student.lastStepCompleted,
    });
  } catch (error) {
    console.error("getStudentApplication error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   GET SINGLE STEP DATA
   GET /api/students/step/:step
   ============================================================ */
export const getStudentStep = async (req, res) => {
  try {
    const step = parseInt(req.params.step);
    if (![1, 2, 3, 4].includes(step)) {
      return res.status(400).json({ success: false, message: "Invalid step" });
    }

    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    let data = {};
    if (step === 1) {
      data = {
        firstName: student.firstName,
        lastName: student.lastName,
        cnic: student.cnic,
        phoneNo: student.phoneNo,
        presentAddress: student.presentAddress,
        permanentAddress: student.permanentAddress,
        religion: student.religion,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        maritalStatus: student.maritalStatus,
        nationality: student.nationality,
        DOB: student.DOB,
        province: student.province,
        domicile: student.domicile,
        profileImage: student.profileImage,
      };
    } else if (step === 2) {
      data = student.family || {};
    } else if (step === 3) {
      data = student.academic || { educationList: [] };
    } else if (step === 4) {
      data = {
        enrollment: student.enrollment,
        campusId: student.campusId,
        departmentId: student.departmentId,
        degreeClassId: student.degreeClassId,
        shiftId: student.shiftId,
      };
    }

    return res.json({ success: true, step, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   SUBMIT APPLICATION
   POST /api/students/submit
   ============================================================ */
export const submitStudentApplication = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (student.lastStepCompleted < 4) {
      return res.status(400).json({
        success: false,
        message: `Please complete all 4 steps. Currently at step ${student.lastStepCompleted}`,
      });
    }

    if (student.status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Application already submitted and pending review",
      });
    }

    student.status = "pending";
    student.isComplete = true;
    await student.save();

    return res.json({
      success: true,
      message: "Application submitted successfully. Waiting for admin approval.",
      student: {
        _id: student._id,
        status: student.status,
        lastStepCompleted: student.lastStepCompleted,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};