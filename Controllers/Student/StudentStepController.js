// Controllers/Student/StudentStepController.js
import mongoose from "mongoose";
import Student from "../../Models/StudentModel.js";
import Application from "../../Models/ApplicationModel.js";
import cloudinary from "../../Cloudinary/CloudConnect.js";
import Campus from "../../Models/Campus.js";
import Department from "../../Models/Department.js";
import DegreeClass from "../../Models/Degreeclass.js";
import Shift from "../../Models/Shift.js";

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

const STEP_FIELDS = {
  1: "personalInfo",
  2: "familyInfo",
  3: "education",
  4: "apply",
};

/* ============================================================
   SAVE STEP
   POST /api/students/step/:step
   Protected (protectStudent)
   ============================================================ */
export const saveStudentStep = async (req, res) => {
  let session = null;
  let createdApplication = null;

  try {
    const step = parseInt(req.params.step);
    const stepData = { ...req.body };

    if (![1, 2, 3, 4].includes(step)) {
      return res.status(400).json({
        success: false,
        message: "Invalid step. Allowed: 1-4",
      });
    }

    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    /* ============================================================
       STEP 1: PERSONAL INFO
       ============================================================ */
    if (step === 1) {
      const {
        firstName, lastName, cnic, DOB, gender,
        religion, nationality, bloodGroup, maritalStatus, phoneNo,
      } = stepData;

      if (!firstName || !lastName || !cnic || !phoneNo) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "firstName, lastName, cnic, phoneNo are required",
        });
      }

      // CNIC unique check
      const existingCnic = await Student.findOne({
        "personalInfo.cnic": cnic,
        _id: { $ne: student._id },
      }).session(session);

      if (existingCnic) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: "CNIC already registered with another account",
        });
      }

      let profileImage = student.personalInfo?.profileImage || { url: "", public_id: "" };

      if (req.file) {
        if (!allowedImageMimeTypes.includes(req.file.mimetype)) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: "Only JPG, PNG, WEBP images allowed",
          });
        }

        if (profileImage.public_id) await cleanupFile(profileImage.public_id);

        profileImage = {
          url: req.file.path,
          public_id: req.file.filename,
        };
      }

      student.personalInfo = {
        firstName, lastName, cnic,
        DOB: DOB ? new Date(DOB) : null,
        gender: gender || "",
        religion: religion || "",
        nationality: nationality || "Pakistani",
        bloodGroup: bloodGroup || "",
        maritalStatus: maritalStatus || "",
        phoneNo,
        profileImage,
      };
    }

    /* ============================================================
       STEP 2: FAMILY INFO
       ============================================================ */
    else if (step === 2) {
      const {
        fatherName, fatherCnic, fatherOccupation, fatherMobile,
        motherName, motherCnic, motherOccupation, motherMobile,
        guardianName, guardianRelation, guardianMobile,
      } = stepData;

      if (!fatherName) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "fatherName is required",
        });
      }

      student.familyInfo = {
        fatherName,
        fatherCnic: fatherCnic || "",
        fatherOccupation: fatherOccupation || "",
        fatherMobile: fatherMobile || "",
        motherName: motherName || "",
        motherCnic: motherCnic || "",
        motherOccupation: motherOccupation || "",
        motherMobile: motherMobile || "",
        guardianName: guardianName || "",
        guardianRelation: guardianRelation || "",
        guardianMobile: guardianMobile || "",
      };
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
        if (!Array.isArray(educationList)) throw new Error("Not array");
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
          message: "At least one education record is required",
        });
      }

      const filesMap = {};
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        req.files.forEach((file) => {
          if (!file || !file.fieldname) return;

          if (!allowedDocumentMimeTypes.includes(file.mimetype)) {
            throw new Error("Only PDF, DOC, DOCX allowed");
          }

          const match = file.fieldname.match(/marksheet_(\d+)/);
          if (match) {
            const index = parseInt(match[1]);
            filesMap[index] = { url: file.path, public_id: file.filename };
          }
        });
      }

      // Clean old marksheets
      if (student.education && student.education.length > 0) {
        for (const edu of student.education) {
          if (edu.markSheet?.public_id) await cleanupFile(edu.markSheet.public_id);
        }
      }

      const finalEducationList = educationList.map((edu, index) => ({
        degreeLevel: edu.degreeLevel || "",
        qualification: edu.qualification || "",
        institution: edu.institution || "",
        boardUni: edu.boardUni || "",
        passingYear: edu.passingYear || "",
        rollNo: edu.rollNo || "",
        totalMarks: edu.totalMarks ? Number(edu.totalMarks) : 0,
        obtainMarks: edu.obtainMarks ? Number(edu.obtainMarks) : 0,
        percentage: edu.percentage || "",
        markSheet: filesMap[index] || edu.markSheet || { url: "", public_id: "" },
      }));

      student.education = finalEducationList;
    }

    /* ============================================================
       STEP 4: APPLY HERE (Enrollment → Multi-Application)
       ============================================================ */
    else if (step === 4) {
      const { degreeClassId, shiftId, program } = stepData;

      // Only 2 required fields
      if (
        !mongoose.Types.ObjectId.isValid(degreeClassId) ||
        !mongoose.Types.ObjectId.isValid(shiftId)
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "degreeClassId and shiftId are required",
        });
      }

      // Fetch DegreeClass with department populated
      const degreeClass = await DegreeClass.findById(degreeClassId)
        .populate("departmentId")
        .session(session);

      if (!degreeClass) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Degree class not found",
        });
      }

      // Get department
      const department = degreeClass.departmentId;
      if (!department) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Department not linked to this degree class",
        });
      }

      // Get campus from department
      const departmentFull = await Department.findById(department._id)
        .populate("campusId")
        .session(session);

      const campus = departmentFull?.campusId;
      if (!campus) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Campus not linked to this department",
        });
      }

      // Get shift
      const shift = await Shift.findById(shiftId).session(session);
      if (!shift) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Shift not found",
        });
      }

      // Verify shift belongs to this degreeClass
      if (String(shift.degreeClassId) !== String(degreeClassId)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Selected shift does not belong to the selected degree class",
        });
      }

      // ✅ Duplicate check (same student + same degreeClass + same shift)
      const existingApp = await Application.findOne({
        student: student._id,
        degreeClassId,
        shiftId,
      }).session(session);

      if (existingApp) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: "You have already applied for this program",
          applicationId: existingApp._id,
          status: existingApp.status,
        });
      }

      // ✅ Create Application (pending)
      const [application] = await Application.create(
        [
          {
            student: student._id,
            program: program || degreeClass.name || "",
            campusId: campus._id,
            departmentId: department._id,
            degreeClassId,
            shiftId,
            enrollmentSnapshot: {
              campus: campus.name || "",
              department: department.name || "",
              degreeClass: degreeClass.name || "",
              shift: shift.name || "",
              program: program || degreeClass.name || "",
            },
            status: "pending",
            submittedAt: new Date(),
          },
        ],
        { session }
      );

      createdApplication = application;
      student.isProfileComplete = true;
    }

    // Progress tracking
    if (!student.completedSteps.includes(step)) {
      student.completedSteps.push(step);
    }
    if (step > student.lastStepCompleted) {
      student.lastStepCompleted = step;
    }

    await student.save({ session });
    await session.commitTransaction();

    return res.json({
      success: true,
      message: `Step ${step} saved successfully`,
      student: {
        _id: student._id,
        lastStepCompleted: student.lastStepCompleted,
        completedSteps: student.completedSteps,
        isProfileComplete: student.isProfileComplete,
      },
      ...(createdApplication && {
        application: {
          _id: createdApplication._id,
          program: createdApplication.program,
          status: createdApplication.status,
          enrollmentSnapshot: createdApplication.enrollmentSnapshot,
          submittedAt: createdApplication.submittedAt,
        },
      }),
    });
  } catch (error) {
    if (session) await session.abortTransaction();
    console.error(`Step ${req.params.step} error:`, error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate entry",
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
   GET SINGLE STEP
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
    if (step === 1) data = student.personalInfo || {};
    else if (step === 2) data = student.familyInfo || {};
    else if (step === 3) data = { educationList: student.education || [] };
    else if (step === 4) {
      const applications = await Application.find({ student: student._id })
        .populate("campusId", "name")
        .populate("departmentId", "name")
        .populate("degreeClassId", "name")
        .populate("shiftId", "name")
        .sort("-createdAt");
      data = { applications };
    }

    return res.json({ success: true, step, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   GET FULL PROFILE
   GET /api/students/profile
   ============================================================ */
export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id)
      .select("-password -emailVerificationToken -resetPasswordToken")
      .populate("user", "email isActive roleSlug");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const applications = await Application.find({ student: student._id })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester")
      .sort("-createdAt");

    return res.json({ success: true, student, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   GET MY APPLICATIONS
   GET /api/students/my-applications
   ============================================================ */
export const getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.student.id })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester")
      .sort("-createdAt");

    return res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ============================================================
   GET SINGLE APPLICATION
   GET /api/students/application/:appId
   ============================================================ */
export const getSingleApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.appId,
      student: req.student.id,
    })
      .populate("campusId", "name")
      .populate("departmentId", "name")
      .populate("degreeClassId", "name")
      .populate("shiftId", "name")
      .populate("batchId", "name currentSemester")
      .populate("reviewedBy", "email");

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found" });
    }

    return res.json({ success: true, application });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};