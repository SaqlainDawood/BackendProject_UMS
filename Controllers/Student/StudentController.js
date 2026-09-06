import mongoose from "mongoose";
import Student from "../../Models/StudentModel.js";
import User from "../../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cloudinary from "../../Cloudinary/CloudConnect.js";
import Batch from "../../Models/Batch.js";
import Enrollment from "../../Models/Enrollment.js";
import Campus from "../../Models/Campus.js";
import Department from "../../Models/Department.js";
import DegreeClass from "../../Models/Degreeclass.js";
import Shift from "../../Models/Shift.js";

// export const step1Create = async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       cnic,
//       DOB,
//       province,
//       domicile,
//       phoneNo,
//       presentAddress,
//       permanentAddress,
//       religion,
//       gender,
//       bloodGroup,
//       maritalStatus,
//       nationality,
//       studentId,
//     } = req.body;

//     const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({
//         success: false,
//         message: "Please enter a valid email address",
//       });
//     }

//     let student;
//     let isUpdate = false;

//     // ✅ UPDATE CASE
//     if (studentId) {
//       student = await Student.findById(studentId).populate("user");

//       if (student) {
//         isUpdate = true;

//         student.firstName = firstName;
//         student.lastName = lastName;
//         student.phoneNo = phoneNo;
//         student.cnic = cnic;
//         student.presentAddress = presentAddress;
//         student.permanentAddress = permanentAddress;
//         student.religion = religion;
//         student.gender = gender;
//         student.bloodGroup = bloodGroup;
//         student.maritalStatus = maritalStatus;
//         student.nationality = nationality;
//         student.DOB = DOB ? new Date(DOB) : undefined;
//         student.province = province;
//         student.domicile = domicile;

//         if (req.file) {
//           student.profileImage = {
//             url: req.file.path,
//             public_id: req.file.filename,
//           };
//         }

//         await student.save();
//       }
//     }

//     // ✅ CREATE CASE
//     if (!isUpdate) {
//       const existingUser = await User.findOne({
//         email: email.toLowerCase().trim(),
//       });

//       if (existingUser) {
//         return res.status(400).json({
//           success: false,
//           message: "Email already exists",
//         });
//       }

//       const user = new User({
//         email: email.toLowerCase().trim(),
//         password: null,
//         role: "student",
//       });

//       await user.save();

//       const profile = req.file
//         ? {
//             url: req.file.path,
//             public_id: req.file.filename,
//           }
//         : {};

//       student = new Student({
//         user: user._id,
//         firstName,
//         lastName,
//         phoneNo,
//         cnic,
//         presentAddress,
//         permanentAddress,
//         religion,
//         gender,
//         bloodGroup,
//         maritalStatus,
//         nationality,
//         DOB: DOB ? new Date(DOB) : undefined,
//         province,
//         domicile,
//         profileImage: profile,

//         // ✅ IMPORTANT FIX
//         status: "draft", // ← YEH LINE ADD KI HAI
//       });

//       await student.save();
//     }

//     return res.status(200).json({
//       success: true,
//       message: isUpdate ? "Updated" : "Created",
//       studentId: student._id,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Step2: update family details
// export const step2Update = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { fatherName, motherName, fatherCnic, fatherMobile } = req.body;

//     const student = await Student.findByIdAndUpdate(
//       id,
//       {
//         family: { fatherName, motherName, fatherCnic, fatherMobile },
//       },
//       { new: true }
//     );

//     if (!student)
//       return res
//         .status(404)
//         .json({ success: false, message: "Student not found" });

//     return res.json({ success: true, message: "Step 2 saved", student });
//   } catch (error) {
//     console.error("Step2 error:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Server error", error: error.message });
//   }
// };

// // Step3: update academic
// export const step3Update = async (req, res) => {
//   try {
//     const { studentId } = req.params;

//     if (!studentId) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Student ID is required" });
//     }

//     // 1️⃣ Validate and parse educationList safely
//     let educationList = [];
//     try {
//       educationList = JSON.parse(req.body.educationList);
//       if (!Array.isArray(educationList)) {
//         return res.status(400).json({
//           success: false,
//           message: "Education list must be an array",
//         });
//       }
//     } catch (err) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid education list format",
//       });
//     }

//     // 2️⃣ Handle uploaded files safely
//     const filesMap = {};
//     if (req.files && Array.isArray(req.files) && req.files.length > 0) {
//       req.files.forEach((file) => {
//         if (file && file.fieldname) {
//           filesMap[file.fieldname] = {
//             url: file.path || null, // Cloudinary file URL
//             public_id: file.filename || null, // Cloudinary public ID
//           };
//         }
//       });
//     }

//     console.log("Uploaded Files:", req.files?.length || 0);
//     console.log("Files Map:", filesMap);

//     // 3️⃣ Map education records with files (index safety)
//     const finalEducationList = educationList.map((edu, index) => {
//       const fileKey = `marksheet_${index}`;
//       return {
//         ...edu,
//         markSheet: filesMap[fileKey] || { url: null, public_id: null },
//       };
//     });
//     //  Check if student exists before updating
//     const existingStudent = await Student.findById(studentId);
//     if (!existingStudent) {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     const updateData = {
//       $push: {
//         "academic.educationList": { $each: finalEducationList },
//       },
//     };
//     const hasMarksheetUploaded = Object.values(filesMap).some(
//       (file) => file.url !== null
//     );

//     if (hasMarksheetUploaded) {
//       updateData.$set = { "documents.marksheet": true };
//     }
//     // Update the student document
//     const updatedStudent = await Student.findByIdAndUpdate(
//       studentId,
//       updateData,
//       {
//         new: true,
//       }
//     );

//     return res.status(200).json({
//       success: true,
//       message: "Education details saved successfully",
//       student: updatedStudent,
//     });
//   } catch (error) {
//     console.error("Step3 Error:", error);
//     return res.status(500).json({
//       success: false,
//       message: error.message || "Internal Server Error",
//     });
//   }
// };

// // Step4: enrollment
// export const step4Update = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { program, session, department, shift, campus, semester } = req.body;

//     // ✅ VALIDATION FIX
//     if (!program || !department || !session) {
//       return res.status(400).json({
//         success: false,
//         message: "All fields are required",
//       });
//     }

//     const student = await Student.findByIdAndUpdate(
//       id,
//       {
//         enrollment: {
//           program,
//           semester,
//           department,
//           shift,
//           campus,
//           session,
//           appliedOn: new Date(),
//         },
//         status: "pending"
//       },
//       { new: true }
//     );
//     if (!student) {
//       return res.status(404).json({
//         success: false,
//         message: "Student not found",
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Registration Completed",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

const validateStepData = (step, data) => {
  switch (step) {
    case 1:
      return data.firstName && data.lastName && data.cnic && data.phoneNo && data.email;
    case 2:
      return data.fatherName; // Only father name is required
    case 3:
      return data.educationList && data.educationList.length > 0;
    case 4:
      return data.degreeClassId && data.shiftId;
    default:
      return false;
  }
};

// Helper function to cleanup files
const cleanupFile = async (publicId) => {
  if (publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Cleaned up file: ${publicId}`);
    } catch (err) {
      console.error("File cleanup error:", err);
    }
  }
};

const cleanupMultipleFiles = async (files) => {
  if (files && Array.isArray(files)) {
    for (const file of files) {
      if (file.public_id) {
        await cleanupFile(file.public_id);
      }
    }
  }
};

// Main atomic save function
export const saveStudentStep = async (req, res) => {
  let session = null;
  const uploadedFiles = []; // Track uploaded files for rollback
  
  try {
    const step = parseInt(req.params.step);
    let stepData = { ...req.body };
    
    // Remove studentId from data if present
    const studentId = stepData.studentId;
    delete stepData.studentId;
    
    // Validate step data
    if (!validateStepData(step, stepData)) {
      return res.status(400).json({
        success: false,
        message: `Step ${step} validation failed. Please fill all required fields.`
      });
    }
    
    // Start MongoDB session for transaction
    session = await mongoose.startSession();
    session.startTransaction();
    
    let student;
    let isNewStudent = false;
    
    // Find or create student
    if (studentId) {
      student = await Student.findById(studentId).session(session);
    }
    
    if (!student) {
      // Check if CNIC already exists
      const existingStudent = await Student.findOne({ cnic: stepData.cnic }).session(session);
      if (existingStudent && !studentId) {
        throw new Error("CNIC already registered");
      }
      
      // Create temporary user
      const tempUser = new User({
        email: stepData.email ? stepData.email.toLowerCase().trim() : `${Date.now()}@temp.com`,
        password: null,
        role: "student",
        isTemporary: true
      });
      await tempUser.save({ session });
      
      student = new Student({
        user: tempUser._id,
        status: "draft",
        isComplete: false,
        lastStepCompleted: 0,
      });
      isNewStudent = true;
    }
    
    // Update based on step
    switch (step) {
      case 1:
        // Handle profile image
        if (req.file) {
          uploadedFiles.push({
            public_id: req.file.filename,
            url: req.file.path,
            type: 'profile'
          });
          stepData.profileImage = {
            url: req.file.path,
            public_id: req.file.filename,
          };
        }
        
        // Update student with step 1 data
        Object.assign(student, {
          firstName: stepData.firstName,
          lastName: stepData.lastName,
          cnic: stepData.cnic,
          phoneNo: stepData.phoneNo,
          presentAddress: stepData.presentAddress,
          permanentAddress: stepData.permanentAddress,
          religion: stepData.religion,
          gender: stepData.gender,
          bloodGroup: stepData.bloodGroup,
          maritalStatus: stepData.maritalStatus,
          nationality: stepData.nationality,
          DOB: stepData.DOB ? new Date(stepData.DOB) : undefined,
          province: stepData.province,
          domicile: stepData.domicile,
          profileImage: stepData.profileImage || student.profileImage,
        });
        
        // Update temporary user email if provided
        if (stepData.email && student.user) {
          const user = await User.findById(student.user).session(session);
          if (user && user.isTemporary) {
            user.email = stepData.email.toLowerCase().trim();
            await user.save({ session });
          }
        }
        
        student.lastStepCompleted = 1;
        break;
        
      case 2:
        student.family = {
          fatherName: stepData.fatherName,
          motherName: stepData.motherName,
          fatherCnic: stepData.fatherCnic,
          fatherMobile: stepData.fatherMobile,
        };
        student.lastStepCompleted = 2;
        break;
        
      case 3:
        // Parse education list
        let educationList = [];
        try {
          educationList = JSON.parse(stepData.educationList);
          if (!Array.isArray(educationList)) {
            throw new Error("Education list must be an array");
          }
        } catch (err) {
          throw new Error("Invalid education list format");
        }
        
        // Handle marksheet uploads
        const filesMap = {};
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          req.files.forEach((file, idx) => {
            if (file && file.fieldname) {
              uploadedFiles.push({
                public_id: file.filename,
                url: file.path,
                type: 'marksheet'
              });
              const match = file.fieldname.match(/marksheet_(\d+)/);
              if (match) {
                filesMap[parseInt(match[1])] = {
                  url: file.path,
                  public_id: file.filename,
                };
              }
            }
          });
        }
        
        // Map files to education entries
        const finalEducationList = educationList.map((edu, index) => ({
          ...edu,
          totalMarks: Number(edu.totalMarks),
          obtainMarks: Number(edu.obtainMarks),
          markSheet: filesMap[index] || edu.markSheet || { url: null, public_id: null }
        }));
        
        student.academic = { educationList: finalEducationList };
        student.lastStepCompleted = 3;
        break;
        
      case 4: {
        // Student sirf Degree Class aur Shift select karta hai.
        // Department aur Campus khud degreeClassId se derive hote hain
        // (bilkul Batch API ki tarah) — frontend se nahi liye jaate.
        // Batch is step par assign NAHI hoti — wo Admin/Coordinator ke
        // approval ke waqt (approveStudents) automatically assign hoti hai.
        const { degreeClassId, shiftId } = stepData;

        if (!mongoose.Types.ObjectId.isValid(degreeClassId)) {
          throw new Error("Invalid degreeClassId selected");
        }

        if (!mongoose.Types.ObjectId.isValid(shiftId)) {
          throw new Error("Invalid shiftId selected");
        }

        const [degreeClass, shift] = await Promise.all([
          DegreeClass.findById(degreeClassId).session(session),
          Shift.findById(shiftId).session(session),
        ]);

        if (!degreeClass) throw new Error("Invalid degreeClassId");
        if (!shift) throw new Error("Invalid shiftId");

        if (String(shift.degreeClassId) !== String(degreeClassId)) {
          throw new Error(
            "Selected shift does not belong to the selected degree class"
          );
        }

        // Department -> internally derived from Degree Class
        const departmentId =
          degreeClass.departmentId?._id || degreeClass.departmentId;

        const department = await Department.findById(departmentId).session(
          session
        );

        if (!department) {
          throw new Error(
            "Could not determine department for the selected degree class"
          );
        }

        // Campus -> internally derived from Department
        const campusId = department.campusId?._id || department.campusId;
        const campus = campusId
          ? await Campus.findById(campusId).session(session)
          : null;

        // Denormalized snapshot — session/semester stay empty for now,
        // since no Batch is assigned yet at this step.
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
        student.batchId = null; // assigned later, at approval time
        student.lastStepCompleted = 4;
        student.isComplete = true;
        student.status = "pending"; // Ready for approval

        break;
      }
    }
    
    // Save student
    await student.save({ session });
    
    // Store temporary files info for cleanup if needed
    if (uploadedFiles.length > 0) {
      student.temporaryFiles = uploadedFiles;
      await student.save({ session });
    }
    
    // Commit transaction
    await session.commitTransaction();
    
    return res.status(200).json({
      success: true,
      message: `Step ${step} saved successfully`,
      studentId: student._id,
      isComplete: student.isComplete,
      lastStepCompleted: student.lastStepCompleted
    });
    
  } catch (error) {
    // Rollback transaction
    if (session) {
      await session.abortTransaction();
    }
    
    // Clean up uploaded files
    await cleanupMultipleFiles(uploadedFiles);
    
    console.error(`Step ${req.params.step} error:`, error);
    
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save step"
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

// Get draft by ID (for resuming)
export const getStudentDraft = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await Student.findById(studentId)
      .populate("user", "email");
    
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Draft not found"
      });
    }
    
    // Check if draft is expired
    if (student.draftExpiresAt && student.draftExpiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: "Draft has expired. Please start over."
      });
    }
    
    // Don't send sensitive data
    const { temporaryFiles, ...safeStudent } = student.toObject();
    
    return res.status(200).json({
      success: true,
      student: safeStudent,
      lastStepCompleted: student.lastStepCompleted
    });
    
  } catch (error) {
    console.error("Get draft error:", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clean up expired drafts (can be called by cron job)
export const cleanupExpiredDrafts = async () => {
  try {
    const expiredDrafts = await Student.find({
      status: "draft",
      draftExpiresAt: { $lt: new Date() }
    });
    
    for (const draft of expiredDrafts) {
      // Clean up files
      if (draft.profileImage?.public_id) {
        await cleanupFile(draft.profileImage.public_id);
      }
      if (draft.academic?.educationList) {
        for (const edu of draft.academic.educationList) {
          if (edu.markSheet?.public_id) {
            await cleanupFile(edu.markSheet.public_id);
          }
        }
      }
      // Delete draft
      await draft.deleteOne();
    }
    
    console.log(`Cleaned up ${expiredDrafts.length} expired drafts`);
  } catch (error) {
    console.error("Cleanup expired drafts error:", error);
  }
};
export const studentLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email",
      });
    }
    
    if (user.role !== "student") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This user is not a student account",
      });
    }
    
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "Credentials not set. Please set credentials first.",
      });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Password" 
      });
    }
    
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }
    
    // ✅ DEBUG: Log status
    console.log('Student Login Attempt:', {
      email: user.email,
      studentId: student._id,
      status: student.status,
      rollNo: student.rollNo
    });
    
    // ✅ Blocked statuses that cannot login
    const blockedStatuses = ["pending", "rejected", "suspend"];
    
   if (student.status !== "approved") {
  let message = "";

  if (student.status === "draft") {
    message = "Please complete your registration first.";
  } 
  else if (student.status === "pending") {
    message = "Your account is waiting for admin approval.";
  } 
  else if (student.status === "rejected") {
    message = "Your application has been rejected.";
  } 
  else if (student.status === "suspend") {
    message = "Your account is suspended.";
  } 
  else {
    message = "You are not allowed to login.";
  }

  return res.status(403).json({
    success: false,
    message,
  });
}
    
    // ✅ Generate token with longer expiry
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        studentId: student._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "7d", // Changed from 2h to 7d
      }
    );
    
    user.lastLogin = new Date();
    await user.save();
    
    console.log('✅ Login successful for:', user.email);

    res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        hasSetPassword: true,
        lastLogin: user.lastLogin,
      },
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        cnic: student.cnic,
        rollNo: student.rollNo || 'N/A',
        phoneNo: student.phoneNo,
        status: student.status,
        profileImage: student.profileImage || null,
        enrollment: student.enrollment || {},
      },
    });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
};

export const getStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id).populate("user", "email role");
    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    return res.json({ success: true, student });
  } catch (error) {
    console.error("getStudent error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate("user", "email role")
      .select("-password");
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error("Get student error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export const StudentCredentials = async (req, res) => {
  try {
    const { cnic, email, password } = req.body;
    // 1. Validate input
    if (!cnic || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }
    // validate cnic format
    if (!/^\d{13}$/.test(cnic)) {
      return res.status(400).json({
        success: false,
        message: "CNIC must be exactly 13 digits!",
      });
    }
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters!",
      });
    }
    const student = await Student.findOne({ cnic });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found with provided CNIC!",
      });
    }
    // if (student.status !== "Approved" && student.status !== "Active") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Your admission is not approved yet. Please contact admin.",
    //     currentStatus: student.status,
    //   });
    // }
    const normalizeEmail = email.toLowerCase().trim();
    const existingUserEmail = await User.findOne({
      email: normalizeEmail,
      _id: { $ne: student.user }, //$ne means “not equal”
      //so the query means " Find a User whose email matches, but whose ID is NOT equal to the ID of the current student’s user."
    });
    if (existingUserEmail) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered to another student!",
      });
    }

    let user;
    if (student.user) {
      user = await User.findById(student.user);
      if (!user) {
        user = await User.create({
          email: normalizeEmail,
          password: await bcrypt.hash(password, 10),
          role: "student",
        });

        student.user = user._id;
        await student.save();
      } else {
        if (user.password) {
          return res.status(400).json({
            success: false,
            message: "Credentials already set. Please login.",
          });
        }
        if (user.email !== normalizeEmail) {
          user.email = normalizeEmail;
        }
      }
    } else {
      user = await User.create({
        email: normalizeEmail,
        password: await bcrypt.hash(password, 10),
        role: "student",
      });
      student.user = user._id;
      await student.save();
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Credentials set successfully!",
      data: {
        userId: user._id,
        studentId: student._id,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered!",
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

export const studentProfile = async(req,res)=>{
  try {
    const student = await Student.findById(req.student._id)
    .populate("user", "email role lasLogin");
    if(!student){
      return res.status(404).json({
        success:false,
        message:"Student not found",
      })
    }
     res.json({
      success: true,
      student:student
    });
  } catch (error) {
      console.error("Get profile error:", error);
       res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
}

// GET ALL STUDENTS — optional filter by status (draft/pending/approved/rejected/suspend)
export const getAllStudents = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { cnic: { $regex: search, $options: "i" } },
        { rollNo: { $regex: search, $options: "i" } },
        { registrationNo: { $regex: search, $options: "i" } },
      ];
    }

    const students = await Student.find(filter)
      .populate("user", "email role")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};