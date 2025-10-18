import Student from "../../Models/StudentModel.js";
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
    const profile = req.file
      ? {
          url: req.file.path, // multer-storage-cloudinary sets path as secure url
          public_id: req.file.filename, // may be available depending on storage lib; check object
       }
      : {};
    const existingStudent = await Student.findOne({
      $or: [{ email }, { cnic }],
    });
    if (existingStudent) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Student email or CNIC already exist ",
        });
    }

    const student = new Student({
      firstName,
      lastName,
      phoneNo,
      email,
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
      message: "Step 1 completed, student created",
      studentId: student._id,
    });
  } catch (error) {
    console.error("Step1 error:", error);
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
      return res.status(400).json({ success: false, message: "Student ID is required" });
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
            url: file.path || null,           // Cloudinary file URL
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
      $push:{
          "academic.educationList": { $each: finalEducationList },
      }
    }
    const hasMarksheetUploaded = Object.values(filesMap).some(
  (file) => file.url !== null
);

if (hasMarksheetUploaded) {
  updateData.$set = { "documents.marksheet": true };
}
    // Update the student document
    const updatedStudent = await Student.findByIdAndUpdate(
      studentId,updateData,{
        new:true,
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
    const { program, session, department, shift, campus , semester } = req.body;

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
    const student = await Student.findOne({ email });
    if (!student) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Email......" });
    }
    if (!student.password) {
      return res
        .status(401)
        .json({
          success: false,
          message: "Credentials not set. Please set credentials first.",
        });
    }
    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid Password" });
    }

    if(student.status === 'pending'){
      return res.status(401).json({
        success:false,
        message:"Your admission is still pending approval by the admin.",
      })
    }
    if(student.status === 'rejected'){
      return res.status(401).json({
        success:false, 
        message:"Your admission is rejected please contact with admin!!!"
      })
    }
    const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || "2h",
    });
    res.status(200).json({
      success: true,
      message: "Login Successfully",
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
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
        status:student.status,
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
    const student = await Student.findById(id);
    if (!student)
      return res.status(404).json({ success: false, message: "Student not found" });
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
    const student = await Student.findById(req.params.id).select("-password");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }
    res.status(200).json({ success: true, student });
  } catch (error) {
    console.error("Get student error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


export const StudentCredentials = async (req, res) => {
  try {
    const { cnic, email, password } = req.body;
    const student = await Student.findOne({ email, cnic });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found!" });
    }

    if (student.password) {
      return res.status(400).json({
        success: false,
        message: "Credentials already set. Please login.",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    student.password = hashedPassword;

    await student.save({ validateModifiedOnly: true });
    res.status(200).json({ success: true, message: "Credentials set successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

