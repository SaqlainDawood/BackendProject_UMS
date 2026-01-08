import Student from "../../Models/StudentModel.js";
import User from "../../Models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Step1: create student with profile image (multipart/form-data)
export const step1Create = async (req, res) => {
  try {
    // multer-storage-cloudinary puts file info in req.file
    const {
      firstName,
      lastName,
      email,
      cnic,
      DOB,
      province,
      domicile,
      phoneNo,
      presentAddress,
      permanentAddress,
      religion,
      gender,
      bloodGroup,
      maritalStatus,
      nationality,
    } = req.body;
    // 1. Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // 2. Check for duplicate email
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please use a different email.",
      });
    }
    const user = new User({
      email: email.toLowerCase().trim(),
      password: null,
      role: "student",
    });
    await user.save();

    const existingStudent = await Student.findOne({ cnic });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        message: "Student with this CNIC already exists",
      });
    }
    const profile = req.file
      ? {
          url: req.file.path, // multer-storage-cloudinary sets path as secure url
          public_id: req.file.filename, // may be available depending on storage lib; check object
        }
      : {};
    // const existingStudent = await Student.findOne({
    //   $or: [{ email }, { cnic }],
    // });
    // if (existingStudent) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Student email or CNIC already exist ",
    //   });
    // }

    const student = new Student({
      user: user._id,
      firstName,
      lastName,
      phoneNo,
      cnic,
      presentAddress,
      permanentAddress,
      religion,
      gender,
      bloodGroup,
      maritalStatus,
      nationality,
      DOB: DOB ? new Date(DOB) : undefined,
      province,
      domicile,
      profileImage: profile,
    });

    await student.save();

    return res.status(201).json({
      success: true,
      message: "Student or user created successfully",
      studentId: student._id,
    });
  } catch (error) {
    console.error("Step1 error:", error);
    if (error.code === 11000 && error.keyPattern?.cnic) {
      return res.status(400).json({
        success: false,
        message: "CNIC already registered",
      });
    }
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Step2: update family details
export const step2Update = async (req, res) => {
  try {
    const { id } = req.params;
    const { fatherName, motherName, fatherCnic, fatherMobile } = req.body;

    const student = await Student.findByIdAndUpdate(
      id,
      {
        family: { fatherName, motherName, fatherCnic, fatherMobile },
      },
      { new: true }
    );

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    return res.json({ success: true, message: "Step 2 saved", student });
  } catch (error) {
    console.error("Step2 error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

// Step3: update academic

// Backend route for step3

export const step3Update = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res
        .status(400)
        .json({ success: false, message: "Student ID is required" });
    }

    // 1️⃣ Validate and parse educationList safely
    let educationList = [];
    try {
      educationList = JSON.parse(req.body.educationList);
      if (!Array.isArray(educationList)) {
        return res.status(400).json({
          success: false,
          message: "Education list must be an array",
        });
      }
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid education list format",
      });
    }

    // 2️⃣ Handle uploaded files safely
    const filesMap = {};
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file && file.fieldname) {
          filesMap[file.fieldname] = {
            url: file.path || null, // Cloudinary file URL
            public_id: file.filename || null, // Cloudinary public ID
          };
        }
      });
    }

    console.log("Uploaded Files:", req.files?.length || 0);
    console.log("Files Map:", filesMap);

    // 3️⃣ Map education records with files (index safety)
    const finalEducationList = educationList.map((edu, index) => {
      const fileKey = `marksheet_${index}`;
      return {
        ...edu,
        markSheet: filesMap[fileKey] || { url: null, public_id: null },
      };
    });
    //  Check if student exists before updating
    const existingStudent = await Student.findById(studentId);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const updateData = {
      $push: {
        "academic.educationList": { $each: finalEducationList },
      },
    };
    const hasMarksheetUploaded = Object.values(filesMap).some(
      (file) => file.url !== null
    );

    if (hasMarksheetUploaded) {
      updateData.$set = { "documents.marksheet": true };
    }
    // Update the student document
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,
      updateData,
      {
        new: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Education details saved successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Step3 Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

// Step4: enrollment
export const step4Update = async (req, res) => {
  try {
    const { id } = req.params;
    const { program, session, department, shift, campus, semester } = req.body;

    const student = await Student.findByIdAndUpdate(
      id,
      {
        enrollment: {
          program,
          semester,
          department,
          shift,
          campus,
          session,
          appliedOn: new Date(),
        },
      },
      { new: true }
    );

    if (!student)
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });

    return res.json({ success: true, message: "Step 4 saved", student });
  } catch (error) {
    console.error("Step4 error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
export const studentLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid Email......",
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
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password" });
    }
    const student = await Student.findOne({ user: user._id });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found",
      });
    }
    if (student.status === "pending") {
      return res.status(401).json({
        success: false,
        message: "Your admission is still pending approval by the admin.",
      });
    }
    if (student.status === "rejected") {
      return res.status(401).json({
        success: false,
        message: "Your admission is rejected please contact with admin!!!",
      });
    }
    if (student.status !== "approved") {
      // If status is not approved, check if it's "approved" (lowercase) and update it
      if (student.status === "approved") {
        student.status = "Approved"; // Fix to match enum
        await student.save();
      } else {
        return res.status(401).json({
          success: false,
          message: "Your account is not approved. Current status: " + student.status,
        });
      }
    }
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        studentId: student._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || "2h",
      }
    );
    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login Successfully",
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
        DOB: student.DOB,
        province: student.province,
        domicile: student.domicile,
        phoneNo: student.phoneNo,
        presentAddress: student.presentAddress,
        permanentAddress: student.permanentAddress,
        religion: student.religion,
        gender: student.gender,
        bloodGroup: student.bloodGroup,
        maritalStatus: student.maritalStatus,
        nationality: student.nationality,
        status: student.status,
        profileImage: student.profileImage || null,
        family: student.family || {},
        academic: student.academic || {},
        enrollment: student.enrollment || {},
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
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