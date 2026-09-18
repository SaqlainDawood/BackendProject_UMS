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

const validateStepData = (step, data) => {
  switch (step) {
    case 1:
      return (
        data.firstName &&
        data.lastName &&
        data.cnic &&
        data.phoneNo &&
        data.email
      );

    case 2:
      return data.fatherName;
    case 3:
      return data.educationList && data.educationList.length > 0;
    case 4:
      return data.degreeClassId && data.shiftId;
    default:
      return false;
  }
};

const allowedImageMimeTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const allowedDocumentMimeTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const validateProfileImage = (file) => {
  if (!file) {
    return true;
  }

  return allowedImageMimeTypes.includes(file.mimetype);
};

const validateDocumentFiles = (files) => {
  if (!files || !Array.isArray(files)) {
    return true;
  }

  return files.every((file) => {
    return allowedDocumentMimeTypes.includes(file.mimetype);
  });
};


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

export const saveStudentStep = async (req, res) => {
  let session = null;
  const uploadedFiles = [];
  try {
    const step = parseInt(req.params.step);
    let stepData = { ...req.body };
    if (![1, 2, 3, 4].includes(step)) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration step.",
      });
    }
    const studentId = stepData.studentId;
    delete stepData.studentId;
    if (step !== 3 && !validateStepData(step, stepData)) {
      return res.status(400).json({
        success: false,
        message: `Step ${step} validation failed. Please fill all required fields.`,
      });
    }
    if (step === 1 && req.file) {
      if (!validateProfileImage(req.file)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid profile image. Only JPG, JPEG, PNG and WEBP images are allowed.",
        });
      }
    }

    if (step === 3 && req.files) {
      if (!validateDocumentFiles(req.files)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid document file. Only PDF, DOC and DOCX files are allowed.",
        });
      }
    }

    session = await mongoose.startSession();
    session.startTransaction();
    let student;
    let isNewStudent = false;
    if (studentId) {
      student = await Student.findById(studentId).session(session);
    }
    if (!student) {
      if (stepData.cnic) {
        const existingStudent = await Student.findOne({
          cnic: stepData.cnic,
        }).session(session);

        if (existingStudent && !studentId) {
          throw new Error("CNIC already registered");
        }
      }
      if (stepData.email) {
        const existingUser = await User.findOne({
          email: stepData.email.toLowerCase().trim(),
        }).session(session);

        if (existingUser) {
          throw new Error("Email already registered");
        }
      }
      const tempUser = new User({
        email: stepData.email
          ? stepData.email.toLowerCase().trim()
          : `${Date.now()}@temp.com`,

        password: null,
        role: "student",
        isTemporary: true,
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
    switch (step) {
        case 1: {
        if (req.file) {
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
          profileImage:
            stepData.profileImage || student.profileImage,
        });
        if (stepData.email && student.user) {
          const user = await User.findById(student.user).session(session);
          if (user) {
            const normalizedEmail = stepData.email
              .toLowerCase()
              .trim();
            if (user.isTemporary) {
              user.email = normalizedEmail;
              await user.save({ session });
            }
          }
        }
        student.lastStepCompleted = 1;
        break;
      }
      case 2: {
        student.family = {
          fatherName: stepData.fatherName,
          motherName: stepData.motherName,
          fatherCnic: stepData.fatherCnic,
          fatherMobile: stepData.fatherMobile,
        };
        student.lastStepCompleted = 2;
        break;
      }
      case 3: {
         let educationList = [];
        try {
          if (typeof stepData.educationList === "string") {
            educationList = JSON.parse(stepData.educationList);
          } else {
            educationList = stepData.educationList;
          }
          if (!Array.isArray(educationList)) {
            throw new Error(
              "Education list must be an array"
            );
          }
        } catch (err) {
          throw new Error(
            "Invalid education list format"
          );
        }
        if (educationList.length === 0) {
          throw new Error(
            "At least one education record is required"
          );
        }
        const filesMap = {};
        if (
          req.files &&
          Array.isArray(req.files) &&
          req.files.length > 0
        ) {
          req.files.forEach((file) => {
            if (!file || !file.fieldname) {
              return;
            }
            if (
              !allowedDocumentMimeTypes.includes(
                file.mimetype
              )
            ) {
              throw new Error(
                "Only PDF, DOC and DOCX files are allowed for marksheets."
              );
            }
            uploadedFiles.push({
              public_id: file.filename,
              url: file.path,
              type: "marksheet",
            });
            const match =
              file.fieldname.match(
                /marksheet_(\d+)/
              );
            if (match) {
              const index = parseInt(match[1]);
              filesMap[index] = {
                url: file.path,
                public_id: file.filename,
              };
            }
          });
        }
        const finalEducationList =
          educationList.map((edu, index) => ({
            ...edu,
            totalMarks:
              edu.totalMarks !== undefined &&
              edu.totalMarks !== ""
                ? Number(edu.totalMarks)
                : undefined,
            obtainMarks:
              edu.obtainMarks !== undefined &&
              edu.obtainMarks !== ""
                ? Number(edu.obtainMarks)
                : undefined,
            markSheet:
              filesMap[index] ||
              edu.markSheet || {
                url: null,
                public_id: null,
              },
          }));
        student.academic = {
          educationList: finalEducationList,
        };
        const hasMarksheetUploaded =
          Object.keys(filesMap).length > 0;
        if (hasMarksheetUploaded) {
          student.documents = {
            ...(student.documents?.toObject
              ? student.documents.toObject()
              : student.documents),
            marksheet: true,
          };
        }
        student.lastStepCompleted = 3;
        break;
      }
      case 4: {
        const {
          degreeClassId,
          shiftId,
        } = stepData;
        if (
          !mongoose.Types.ObjectId.isValid(
            degreeClassId
          )
        ) {
          throw new Error(
            "Invalid degreeClassId selected"
          );
        }
        if (
          !mongoose.Types.ObjectId.isValid(shiftId)
        ) {
          throw new Error(
            "Invalid shiftId selected"
          );
        }

        const [degreeClass, shift] =
          await Promise.all([
            DegreeClass.findById(
              degreeClassId
            ).session(session),

            Shift.findById(
              shiftId
            ).session(session),
          ]);

        /*
        |--------------------------------------------------------------------------
        | Validate Degree Class
        |--------------------------------------------------------------------------
        */

        if (!degreeClass) {
          throw new Error(
            "Invalid degreeClassId"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Validate Shift
        |--------------------------------------------------------------------------
        */

        if (!shift) {
          throw new Error(
            "Invalid shiftId"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Make Sure Shift Belongs To Degree Class
        |--------------------------------------------------------------------------
        */

        if (
          String(shift.degreeClassId) !==
          String(degreeClassId)
        ) {
          throw new Error(
            "Selected shift does not belong to the selected degree class"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Department
        |--------------------------------------------------------------------------
        */

        const departmentId =
          degreeClass.departmentId?._id ||
          degreeClass.departmentId;

        if (!departmentId) {
          throw new Error(
            "Could not determine department for the selected degree class"
          );
        }

        const department =
          await Department.findById(
            departmentId
          ).session(session);

        if (!department) {
          throw new Error(
            "Could not determine department for the selected degree class"
          );
        }

        /*
        |--------------------------------------------------------------------------
        | Campus
        |--------------------------------------------------------------------------
        */

        const campusId =
          department.campusId?._id ||
          department.campusId;

        const campus = campusId
          ? await Campus.findById(
              campusId
            ).session(session)
          : null;

        /*
        |--------------------------------------------------------------------------
        | Enrollment Snapshot
        |--------------------------------------------------------------------------
        */

        student.enrollment = {
          program:
            degreeClass.name || "",

          semester: "",

          session: "",

          department:
            department.name || "",

          shift:
            shift.name || "",

          campus:
            campus?.name || "",

          appliedOn: new Date(),
        };

        /*
        |--------------------------------------------------------------------------
        | IDs
        |--------------------------------------------------------------------------
        */

        student.campusId =
          campusId || null;

        student.departmentId =
          departmentId;

        student.degreeClassId =
          degreeClassId;

        student.shiftId =
          shiftId;
        student.batchId = null;
        student.lastStepCompleted = 4;
        student.isComplete = true;
        student.status = "pending";
        break;
      }
    }
    await student.save({ session });
    if (uploadedFiles.length > 0) {
      student.temporaryFiles =
        uploadedFiles;
      await student.save({ session });
    }
    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      message: `Step ${step} saved successfully`,
      studentId: student._id,
      isComplete:
      student.isComplete,
      lastStepCompleted:
      student.lastStepCompleted,
    });
  } catch (error) {
    console.error(
      `Step ${req.params.step} error:`,
      error
    );
    if (
      error.message?.includes(
        "Only PDF, DOC and DOCX"
      )
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Duplicate data already exists.",
        error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to save step",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
export const getStudentDraft = async (
  req,
  res
) => {
  try {
    const { studentId } =
      req.params;
    const student =
      await Student.findById(
        studentId
      ).populate(
        "user",
        "email"
      );
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Draft not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Check Expiry
    |--------------------------------------------------------------------------
    */

    if (
      student.draftExpiresAt &&
      student.draftExpiresAt <
        new Date()
    ) {
      return res.status(410).json({
        success: false,
        message:
          "Draft has expired. Please start over.",
      });
    }
    const {
      temporaryFiles,
      ...safeStudent
    } = student.toObject();
    return res.status(200).json({
      success: true,
      student: safeStudent,
      lastStepCompleted:
        student.lastStepCompleted,
    });
  } catch (error) {
    console.error(
      "Get draft error:",
      error
    );
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const cleanupExpiredDrafts =
  async () => {
    try {
      const expiredDrafts =
        await Student.find({
          status: "draft",

          draftExpiresAt: {
            $lt: new Date(),
          },
        });

      for (const draft of expiredDrafts) {
        /*
        |--------------------------------------------------------------------------
        | Profile Image
        |--------------------------------------------------------------------------
        */

        if (
          draft.profileImage
            ?.public_id
        ) {
          await cleanupFile(
            draft.profileImage.public_id
          );
        }
        if (
          draft.academic
            ?.educationList
        ) {
          for (const edu of
            draft.academic
              .educationList) {
            if (
              edu.markSheet
                ?.public_id
            ) {
              await cleanupFile(
                edu.markSheet
                  .public_id
              );
            }
          }
        }
        await draft.deleteOne();
      }
      console.log(
        `Cleaned up ${expiredDrafts.length} expired drafts`
      );
    } catch (error) {
      console.error(
        "Cleanup expired drafts error:",
        error
      );
    }
  };
export const studentLogin = async (
  req,
  res
) => {
  const {
    email,
    password,
  } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }
    const user =
      await User.findOne({
        email:
          email
            .toLowerCase()
            .trim(),
      });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email",
      });
    }
    if (user.role !== "student") {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. This user is not a student account",
      });
    }
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message:
          "Credentials not set. Please set credentials first.",
      });
    }
    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid Password",
      });
    }
    const student =
      await Student.findOne({
        user: user._id,
      });
    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student profile not found",
      });
    }
    console.log(
      "Student Login Attempt:",
      {
        email: user.email,
        studentId:
          student._id,
        status:
          student.status,
        rollNo:
          student.rollNo,
      }
    );
    if (
      student.status !==
      "approved"
    ) {
      let message =
        "You are not allowed to login.";
      if (
        student.status ===
        "draft"
      ) {
        message =
          "Please complete your registration first.";
      } else if (
        student.status ===
        "pending"
      ) {
        message =
          "Your account is waiting for admin approval.";
      } else if (
        student.status ===
        "rejected"
      ) {
        message =
          "Your application has been rejected.";
      } else if (
        student.status ===
        "suspend"
      ) {
        message =
          "Your account is suspended.";
      }

      return res.status(403).json({
        success: false,
        message,
      });
    }
    const token =
      jwt.sign(
        {
          id: user._id,

          role: user.role,

          studentId:
            student._id,
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            process.env.JWT_EXPIRE ||
            "7d",
        }
      );
    user.lastLogin =
      new Date();
    await user.save();
    console.log(
      "Login successful for:",
      user.email
    );
    return res.status(200).json({
      success: true,
      message:
        "Login Successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        hasSetPassword: true,
        lastLogin:
          user.lastLogin,
      },
      student: {
        id: student._id,
        firstName:
          student.firstName,
        lastName:
          student.lastName,
        cnic:
          student.cnic,
        rollNo:
          student.rollNo ||
          "N/A",
        phoneNo:
          student.phoneNo,
        status:
          student.status,
        profileImage:
          student.profileImage ||
          null,
        enrollment:
          student.enrollment ||
          {},
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );
    return res.status(500).json({
      success: false,
      message:
        "Server error",
      error:
        error.message,
    });
  }
};
export const getStudent = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const student =
      await Student.findById(
        id
      ).populate(
        "user",
        "email role"
      );
    if (!student) {
      return res.status(404).json({
        success: false,
        message:
          "Student not found",
      });
    }
    return res.json({
      success: true,
      student,
    });
  } catch (error) {
    console.error(
      "getStudent error:",
      error
    );
    return res.status(500).json({
      success: false,
      message:
        "Server error",
      error:
        error.message,
    });
  }
};
export const getStudentById =
  async (req, res) => {
    try {
      const student =
        await Student.findById(
          req.params.id
        )
          .populate(
            "user",
            "email role"
          )
          .select(
            "-password"
          );
      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }
      return res.status(200).json({
        success: true,
        student,
      });
    } catch (error) {
      console.error(
        "Get student error:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          "Server error",
        error:
          error.message,
      });
    }
  };
export const StudentCredentials =
  async (req, res) => {
    try {
      const {
        cnic,
        email,
        password,
      } = req.body;
      if (
        !cnic ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All fields are required!",
        });
      }
      if (
        !/^\d{13}$/.test(cnic)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "CNIC must be exactly 13 digits!",
        });
      }
      if (
        password.length < 6
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 6 characters!",
        });
      }
      const student =
        await Student.findOne({
          cnic,
        });
      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found with provided CNIC!",
        });
      }
      const normalizeEmail =
        email
          .toLowerCase()
          .trim();
      const existingUserEmail =
        await User.findOne({
          email:
            normalizeEmail,
          _id: {
            $ne:
              student.user,
          },
        });
      if (existingUserEmail) {
        return res.status(400).json({
          success: false,
          message:
            "This email is already registered to another student!",
        });
      }
      let user;
      if (student.user) {
        user =
          await User.findById(
            student.user
          );
        if (!user) {
          user =
            await User.create({
              email:
                normalizeEmail,
              password:
                await bcrypt.hash(
                  password,
                  10
                ),
              role:
                "student",
            });
          student.user =
            user._id;
          await student.save();
        } else {
          if (user.password) {
            return res.status(400).json({
              success: false,
              message:
                "Credentials already set. Please login.",
            });
          }
          if (
            user.email !==
            normalizeEmail
          ) {
            user.email =
             normalizeEmail;
          }
        }
      } else {
        user =
          await User.create({
            email:
              normalizeEmail,
            password:
              await bcrypt.hash(
                password,
                10
              ),
            role:
              "student",
          });
        student.user =
          user._id;
        await student.save();
      }
      const salt =
        await bcrypt.genSalt(
          10
        );
      const hashedPassword =
        await bcrypt.hash(
          password,
          salt
        );
      user.password =
        hashedPassword;
      user.isTemporary =
        false;
      await user.save();
      return res.status(200).json({
        success: true,
        message:
          "Credentials set successfully!",
        data: {
          userId:
            user._id,
          studentId:
            student._id,
          email:
            user.email,
        },
      });
    } catch (error) {
      if (
        error.code ===
          11000 &&
        error.keyPattern?.email
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This email is already registered!",
        });
      }
      if (
        error.name ===
        "ValidationError"
      ) {
        const messages =
          Object.values(
            error.errors
          ).map(
            (err) =>
              err.message
          );
        return res.status(400).json({
          success: false,
          message:
            messages.join(", "),
        });
      }
      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };
export const studentProfile =
  async (req, res) => {
    try {
      const student =
        await Student.findById(
          req.student._id
        ).populate(
          "user",
          "email role lastLogin"
        );

      if (!student) {
        return res.status(404).json({
          success: false,
          message:
            "Student not found",
        });
      }
      return res.json({
        success: true,
        student,
      });
    } catch (error) {
      console.error(
        "Get profile error:",
        error
      );
      return res.status(500).json({
        success: false,
        message:
          "Server error",
      });
    }
  };
export const getAllStudents =
  async (req, res) => {
    try {
      const {
        status,
        search,
      } = req.query;

      const filter = {};
      if (status) {
        filter.status =
          status;
      }
      if (search) {
        filter.$or = [
          {
            firstName: {
              $regex:
                search,
              $options:
                "i",
            },
          },

          {
            lastName: {
              $regex:
                search,
              $options:
                "i",
            },
          },

          {
            cnic: {
              $regex:
                search,
              $options:
                "i",
            },
          },

          {
            rollNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },

          {
            registrationNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
        ];
      }
      const students =
        await Student.find(
          filter
        )
          .populate(
            "user",
            "email role"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,

        count:
          students.length,

        students,
      });
    } catch (error) {
      console.error(
        "Get all students error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error",

        error:
          error.message,
      });
    }
  };
