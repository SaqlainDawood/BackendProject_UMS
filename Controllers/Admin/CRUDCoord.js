import Coordinator from "../../Models/CoordinatorModel.js";
import User from "../../Models/userModel.js";
import cloudinary from "../../Cloudinary/CloudConnect.js";
import { sendCoordEmail } from "../../utils/CoorRegisterEmail.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";


export const registerCoordinator = async (req, res) => {
  let user = null; // Track user for manual cleanup
  
  try {
    const coordinatorData = req.body;

    // Parse permissions if string
    if (typeof coordinatorData.permissions === "string") {
      coordinatorData.permissions = JSON.parse(coordinatorData.permissions);
    }

    // Extract username and password
    const username = coordinatorData.username;
    const password = coordinatorData.password;

    console.log("=== DEBUG START ===");
    console.log("Username:", username);
    console.log("Password:", password ? "***" : "undefined");
    console.log("=== DEBUG END ===");
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.profileImage) {
        const profileImage = req.files.profileImage[0];
        coordinatorData.profileImage = {
          url: profileImage.path,
          public_id: profileImage.filename,
        };
      }
      if (req.files.degreeCertificate) {
        const degreeCertificate = req.files.degreeCertificate[0];
        coordinatorData.degreeCertificate = {
          url: degreeCertificate.path,
          public_id: degreeCertificate.filename,
        };
      }
    }

    // ===== VALIDATIONS =====
    // Check if coordinator ID already exists
    const existingCoordinatorId = await Coordinator.findOne({
      coordId: coordinatorData.coordId,
    });
    if (existingCoordinatorId) {
      if (coordinatorData.profileImage?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.profileImage.public_id
        );
      }
      if (coordinatorData.degreeCertificate?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.degreeCertificate.public_id
        );
      }
      return res.status(400).json({
        success: false,
        message: "Coordinator ID already exists",
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({
      email: coordinatorData.email,
    });
    if (existingEmail) {
      if (coordinatorData.profileImage?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.profileImage.public_id
        );
      }
      if (coordinatorData.degreeCertificate?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.degreeCertificate.public_id
        );
      }
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Check if CNIC already exists
    const existingCnic = await Coordinator.findOne({
      cnic: coordinatorData.cnic,
    });
    if (existingCnic) {
      if (coordinatorData.profileImage?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.profileImage.public_id
        );
      }
      if (coordinatorData.degreeCertificate?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.degreeCertificate.public_id
        );
      }
      return res.status(400).json({
        success: false,
        message: "CNIC already exists",
      });
    }

    // Check if username already exists
    const existingUserName = await Coordinator.findOne({
      username: username,
    });
    if (existingUserName) {
      if (coordinatorData.profileImage?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.profileImage.public_id
        );
      }
      if (coordinatorData.degreeCertificate?.public_id) {
        await cloudinary.uploader.destroy(
          coordinatorData.degreeCertificate.public_id
        );
      }
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    // ===== CREATE USER =====
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      email: coordinatorData.email,
      password: hashedPassword,
      role: "coordinator",
    });
    
    await user.save(); // NO SESSION

    // ===== CREATE COORDINATOR =====
    const mappedCoordinatorData = {
      user: user._id,
      // Personal Information
      coordId: coordinatorData.coordId,
      name: coordinatorData.name,
      phone: coordinatorData.phone,
      cnic: coordinatorData.cnic,
      address: coordinatorData.address,
      DOB: coordinatorData.DOB,
      username: username,
      // Academic Credentials
      highestQualification: coordinatorData.highestQualification,
      specialization: coordinatorData.specialization,
      institution: coordinatorData.institution,
      graduationYear: coordinatorData.graduationYear,
      // Professional Experience
      yearsOfExperience: coordinatorData.yearsOfExperience,
      previousPosition: coordinatorData.previousPosition,
      previousInstitution: coordinatorData.previousInstitution,
      areaOfExpertise: coordinatorData.areaOfExpertise,

      // Employment Details
      employmentType: coordinatorData.employmentType,
      salaryGrade: coordinatorData.salaryGrade,
      basicSalary: coordinatorData.basicSalary,
      contractExpiry: coordinatorData.contractExpiry || undefined,
      probationPeriod: coordinatorData.probationPeriod || 0,
      bankAccount: coordinatorData.bankAccount,
      bankAccountTitle: coordinatorData.bankAccountTitle,
      bankName: coordinatorData.bankName,
      // Coordinator Role
      department: coordinatorData.department,
      coordinatorRole: coordinatorData.role,
      roleTitle: coordinatorData.roleTitle,
      // Permissions
      permissions: coordinatorData.permissions || {
        students: [],
        faculty: [],
        courses: [],
        examinations: [],
        fees: [],
        reports: [],
      },

      // Emergency Contact
      emergencyContactName: coordinatorData.emergencyContactName,
      emergencyContactPhone: coordinatorData.emergencyContactPhone,

      // Status
      status: coordinatorData.status || "active",
      joiningDate: coordinatorData.joiningDate || new Date(),

      // Admin who created this coordinator
      createdBy: req.user?._id,
    };

    // Add file uploads if they exist
    if (coordinatorData.profileImage) {
      mappedCoordinatorData.profileImage = coordinatorData.profileImage;
    }
    if (coordinatorData.degreeCertificate) {
      mappedCoordinatorData.degreeCertificate = coordinatorData.degreeCertificate;
    }
    
    // ===== SAVE COORDINATOR =====
    const coordinator = new Coordinator(mappedCoordinatorData);
    await coordinator.save(); // NO SESSION
    
    // Update user with coordinator reference
    user.coordinatorProfile = coordinator._id;
    await user.save();
    // ===== PREPARE RESPONSE =====
    const populatedCoordinator = await Coordinator.findById(coordinator._id)
      .populate('user', 'email role isActive lastLogin createdAt');

    const coordinatorResponse = populatedCoordinator.toObject();
    
    // Remove sensitive data
    delete coordinatorResponse.user?.password;
    
    // Add convenience fields
    coordinatorResponse.email = coordinatorData.email;
    coordinatorResponse.username = username;

    // ===== SUCCESS RESPONSE =====
    res.status(201).json({
      success: true,
      message: "Coordinator registered successfully",
      coordinator: coordinatorResponse
    });

  } catch (error) {
    console.error("Registration error:", error);
    
    // ===== MANUAL CLEANUP: Delete user if coordinator failed =====
    if (user && user._id) {
      try {
        await User.findByIdAndDelete(user._id);
        console.log("Cleaned up orphaned user:", user._id);
      } catch (cleanupError) {
        console.error("Error cleaning up user:", cleanupError);
      }
    }
    
    // Clean up files
    if (req.files) {
      try {
        if (req.files.profileImage) {
          await cloudinary.uploader.destroy(req.files.profileImage[0].filename);
        }
        if (req.files.degreeCertificate) {
          await cloudinary.uploader.destroy(
            req.files.degreeCertificate[0].filename
          );
        }
      } catch (cleanupError) {
        console.error("Error cleaning up files:", cleanupError);
      }
    }

    // Handle specific errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      let message = `${field} already exists`;
      if (field === "coordId") message = "Coordinator ID already exists";
      if (field === "cnic") message = "CNIC already exists";
      if (field === "email") message = "Email already exists";
      if (field === "username") message = "Username already exists";
      
      return res.status(400).json({
        success: false,
        message: message,
      });
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 5MB",
      });
    }

    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field",
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const sendCoordCredentials = async (req, res) => {
  try {
    const data = req.body;
    await sendCoordEmail({ ...data });
    res.json({
      success: true,
      message: "Coordinator email sent successfully",
    });
  } catch (error) {
    console.log("Failed to Send Email", error);
    res.status(500).json({
      success: false,
      message: "Failed to send email to coordinator",
    });
  }
};

export const getAllCoordinators = async (req,res)=>{
    try {
        const totalCoordinators = await Coordinator.countDocuments({
          isDeleted:false,
          status:'active'
        });
        
        const department = await Coordinator.aggregate([
          {$match:{
            isDeleted:false,
            status: 'active' 
          }},
          {$group:{
            _id:"$department",
            totalCoordinators:{$sum:1}
          }},
          {
            $project:{
              _id:0,
              department:"$_id",
              totalCoordinators:1
            }
          }
        ])
        const coordinators = await Coordinator.find({
          isDeleted:false,
          status:'active'
      })
        .populate("user" , "email role isActive lastLogin")
        .sort({ createdAt: -1 });
        res.status(200).json({
          success:true,
          data:{
            coordinators,
            total:totalCoordinators,
            byDepartment:department,
          }
          
        })
    } catch (error) {
      console.log("Error in fetching all coordinators",error);
      res.status(500).json({
        success:false,
        message:"Failed to fetching all of the coordinators",
        error:error.message,
      })
    }
}

export const viewCoordinator = async(req,res)=>{
  try {
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(404).json({
        success:false,
        message:"Invalid Object Id......",
      })
    }
    // console.log("Coordinator ID received:", req.params.id);
    const coordinator = await Coordinator.findOne({
      _id:id,
      isDeleted:false
    })
    .populate("user","email role isActive lastLogin password"); 
    if(!coordinator){
      return res.status(404).json({
        success:false,
        message:`This coordinator ${id} is not found!!!!`,
      })
    }
    res.status(201).json({
        success:true,
        message:"Coordinator Found Successfully",
        data:coordinator,
      })
  } catch (error) {
    console.log("Server Error for fetching the specific record of Coordinator......",error);
    res.status(500).json({
      success:false,
      message:"Server error while fetching coordinator",
    })
  }
};
export const updateCoordinator = async(req,res)=>{
  try {
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(400).json({
        success:false,
        message:"Invalid Coordinator ID",
      })
    }
    const coordinator = await Coordinator.findOne({
      _id:id,
      isDeleted:false,
    }).populate("user","email role isActive lastLogin");
    if(!coordinator){
      return res.status(404).json({
        success:false,
        message:"Coordinator Not found",
      })
    }
    const { user, password, createdAt, createdBy, ...safeData} = req.body;
    const coordUpdateData = await Coordinator.findOneAndUpdate({
      _id:id,
      isDeleted:false,
    },
    safeData,
    {new:true, runValidators:true},
  ).populate("user","email role isActive lastLogin");
  if(!coordUpdateData){
    return res.status(401).json({
      success:false,
      message:"Coordinator is not found!!!!",
    })
  }
  if(user?.email){
    await User.findOneAndUpdate(coordUpdateData.user._id, {
      email:user.email,
    })
  }
  if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.findByIdAndUpdate(coordUpdateData.user._id, {
        password: hashedPassword,
      });
    }
   res.status(200).json({
      success:true,
      message:"Coordinator Updated Successfully",
      data:coordUpdateData,
    })
  } catch (error) {
    console.log(" Server Error for updating the coordinator",error);
    res.status(500).json({
      success:false,
      message:"Server Error for updating the coordinator"||error.message,
    })
  }
}
// ========= Soft Delete =======
// export const deleteCoordiantor = async(req,res)=>{
//   try {
//     const {id} = req.params;
//       if(!mongoose.Types.ObjectId.isValid(id)){
//         return res.status(400).json({
//           success:false,
//           message:"Invalid Coordinator ID",
//         })
//       }
//       const coordinator = await Coordinator.findOne({
//         _id:id,
//         isDeleted:false,
//       })
//       if(!coordinator){
//         return res.status(404).json({
//           success:false,
//           message:"Coordinator Not Found!!",
//         });
//       }
//       coordinator.isDeleted = true,
//       coordinator.status = "inactive",
//       await coordinator.save();
//       await User.findByIdAndUpdate(
//         coordinator.user,
//         {
//           isDeleted:true,
//           isActive:false,
//         },
//         {new:true}
//       )
//       return res.status(200).json({
//         success:true,
//         message:"Coordinator and user account Deleted Successfully ",
//       })
//   } catch (error) {
//     console.log("Delete Error for coordinator",error);
//     res.status(500).json({
//       success:false,
//       message:"Server Error for Deletion Coordiantor" || error.message,
//     })
//   }
// }
export const deleteCoordPermanently = async(req,res)=>{
  try {
    const {id} = req.params;
    if(!mongoose.Types.ObjectId.isValid(id)){
      return res.status(400).json({
        success:false,
        message:"Invalid Coordinator ID",
      })
    }
    const coordinator = await Coordinator.findById(id);
    if(!coordinator){
      return res.status(401).json({
        success:false,
        message:"Coordinator not found!!"|| error.message,
      })
    }
    if(coordinator.profileImage?.public_id){
      await cloudinary.uploader.destroy(coordinator.profileImage?.public_id)
    }
    if(coordinator.degreeCertificate?.public_id){
      await cloudinary.uploader.destroy(coordinator.degreeCertificate?.public_id);
    }
    await User.findByIdAndDelete(coordinator.user);
    await Coordinator.findByIdAndDelete(id);
    res.status(200).json({
      success:true,
      message:"Coordinator Deleted Successfully",
    })
  } catch (error) {
    console.log("Delete Coordinator Error",error);
    res.status(500).json({
      success:false,
      message:"Server Error For Deletion Coordinator"||error.message,
    })
  }
}

