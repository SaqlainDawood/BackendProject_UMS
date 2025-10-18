import Faculty from "../../Models/TeacherModel.js";
import mongoose from "mongoose";
// ITS ADMIN SIDE CONTROLLERS
export const facultyAdd = async (req, res) => {
  try {
    const {
      employeeID,
      firstName,
      lastName,
      email,
      phone,
      cnic,
      dateOfBirth: dobString,
      gender,
      city,
      department,
      designation,
      qualification,
      specialization,
      experience,
      joiningDate: joinString,
      salary,
      accountTitle,
      accountNumber,
      bankName,
      emergencyContact,
      emergencyPerson,
    } = req.body;
    // Validation checks
    const requiredFields = [
      "employeeID",
      "firstName",
      "lastName",
      "email",
      "phone",
      "cnic",
      "dateOfBirth",
      "gender",
      "city",
      "department",
      "designation",
      "qualification",
      "specialization",
      "experience",
      "joiningDate",
      "salary",
      "accountTitle",
      "accountNumber",
      "bankName",
      "emergencyContact",
      "emergencyPerson",
    ];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields:${missingFields.join(",")}`,
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Profile Image is not uploaded",
      });
    }
    const existingFaculty = await Faculty.findOne({
      $or: [
        { employeeID: req.body.employeeID },
        { email: req.body.email },
        { cnic: req.body.cnic },
      ],
    });
    if (existingFaculty) {
      let duplicateField = "";
      if (existingFaculty.employeeID === req.body.employeeID)
        duplicateField = "Employee ID";
      else if (existingFaculty.email === req.body.email)
        duplicateField = "Email";
      else if (existingFaculty.cnic === req.body.cnic) duplicateField = "CNIC";

      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists`,
      });
    }
    const cnicRegex = /^\d{13}$/;
    if (!cnicRegex.test(cnic)) {
      return res.status(400).json({
        success: false,
        message: "CNIC must be exactly 13 digits without dashes",
      });
    }
    const dateOfBirth = new Date(dobString);
    const joiningDate = new Date(joinString);
    const today = new Date();

    if (isNaN(dateOfBirth.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth",
      });
    }

    if (isNaN(joiningDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid joining date",
      });
    }

    if (joiningDate > today) {
      return res.status(400).json({
        success: false,
        message: "Joining date cannot be in the future",
      });
    }
    const validGenders = ["Male", "Female", "Other"];
    if (!validGenders.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: "Gender must be Male, Female, or Other",
      });
    }
    if (req.body.salary <= 0) {
      return res.status(400).json({
        success: false,
        message: "Salary must be greater than 0",
      });
    }

    const newFaculty = new Faculty({
      employeeID,
      firstName,
      lastName,
      email: email.toLowerCase().trim(),
      phone,
      cnic,
      dateOfBirth: new Date(dobString),
      gender,
      city,
      department,
      designation,
      qualification,
      specialization,
      experience: parseInt(experience),
      joiningDate: new Date(joinString),
      salary: parseFloat(salary),
      accountTitle,
      accountNumber,
      bankName,
      emergencyContact,
      emergencyPerson,
      profileImage: req.file.path,
    });
    await newFaculty.save();

    res.status(201).json({
      success: true,
      message: "Faculty Member Saved Successfully",
      data: {
        id: newFaculty._id,
        employeeID: newFaculty.employeeID,
        firstName: newFaculty.firstName,
        lastName: newFaculty.lastName,
        email: newFaculty.email,
        department: newFaculty.department,
        designation: newFaculty.designation,
        profileImage: newFaculty.profileImage,
      },
    });
  } catch (error) {
    console.log("Faculty Addition Error", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getAllFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find().sort({ createdAt: -1 });
    const formatted = faculties.map((f) => ({
      _id: f._id,
      employeeID: f.employeeID,
      name: `${f.firstName} ${f.lastName}`,
      email: f.email,
      phone: f.phone,
      department: f.department,
      designation: f.designation,
      qualification: f.qualification,
      specialization: f.specialization,
      experience: `${f.experience} years`,
      joiningDate: f.joiningDate.toISOString().split("T")[0],
      status: f.status,
      image: f.profileImage,
      salary:f.salary,
      coursesAssigned: f.coursesAssigned,
    }));
    res.status(200).json({
        success:true,
        message:"Faculty Record fetched Successfully",
        data:formatted,
    })
  } catch (error) {
    console.error("Error fetching faculty:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching faculty data",
    });
  }
};

export const deleteFaculty = async(req ,res)=>{
    try {
        console.log("Delete Request Faculty ID is:",req.params.id);
        const faculty = await Faculty.findByIdAndDelete(req.params.id);
        if(!faculty)
        return res.status(404).json({
        success:false,
        message:"Faculty Not Found!!",
        })
        return res.status(200).json({
            success:true,
            message:"Faculty Deleted successfully",
        })
        
    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
}
export const getFacultyById = async(req,res)=>{
    
    try {
      const {id} = req.params;
       if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid faculty ID format",
      });
    }
          console.log("Faculty ID received:", req.params.id);
        const faculty = await Faculty.findById(req.params.id)
        if(!faculty){
            return res.status(404).json({
                success:false,
                message:"Faculty Member not found",
            })
        }
    const formatted = {
      id: faculty._id,
      name: `${faculty.firstName} ${faculty.lastName}`,
      employeeID: faculty.employeeID,
      email: faculty.email,
      phone: faculty.phone,
      department: faculty.department,
      designation: faculty.designation,
      qualification:faculty.qualification,
      specialization: faculty.specialization,
      experience: `${faculty.experience} years`,
      joiningDate: faculty.joiningDate?.toISOString().split("T")[0],
      status: faculty.status,
      cnic:faculty.cnic,
      address:faculty.address,
      dateOfBirth:faculty.dateOfBirth,
      gender:faculty.gender,
      city:faculty.city,
      accountTitle:faculty.accountTitle,
      accountNumber:faculty.accountNumber,
      bankName:faculty.bankName,
      emergencyContact:faculty.emergencyContact,
      emergencyPerson:faculty.emergencyPerson,
      salary: faculty.salary,
      image: faculty.profileImage,
      coursesAssigned: faculty.coursesAssigned,
    };
        res.status(200).json(formatted);
    } catch (error) {
         console.error("Error in getFacultyById:", error.message);
        res.status(500).json({
            success:false,
            message:"Error Fetching the Faculty Details",
        })
    }
}

export const updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Step 1: Check if ID exists
    const faculty = await Faculty.findById(id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found...",
      });
    }

    // ✅ Step 2: Remove unallowed fields from req.body
    const allowedFields = [
      "employeeID",
      "name",
      "email",
      "phone",
      "cnic",
      "dateOfBirth",
      "gender",
      "city",
      "department",
      "designation",
      "qualification",
      "specialization",
      "experience",
      "joiningDate",
      "salary",
      "accountTitle",
      "accountNumber",
      "bankName",
      "emergencyContact",
      "emergencyPerson",
      "status",
      "coursesAssigned",
      "profileImage"
    ];

    const filteredBody = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        filteredBody[key] = req.body[key];
      }
    }

    // ✅ Step 3: Update record safely
    const updatedFaculty = await Faculty.findByIdAndUpdate(id, filteredBody, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Faculty Updated Successfully",
      data: updatedFaculty,
    });
  } catch (error) {
    console.error("Error updating faculty:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server Error while updating the Faculty Member",
      error: error.message, // include real error for debugging
    });
  }
};
