import Admin from "../../Models/AdminModel.js";
import bcrypt from "bcryptjs";
import generatToken from "../../utils/token.js";
import jwt from 'jsonwebtoken';
import User from "../../Models/userModel.js";
export const adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter all the fields....." });
    }
    // 1. Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please use a different email.",
      });
    }

    // const existingAdmin = await User.findOne({ email });
    // if (existingAdmin) {
    //   return res.status(401).json({
    //     success: false,
    //     message: "Admin is already Register please Login!!!!",
    //   });
    // }
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
        email,
        password:hashPassword,
        role:"admin",
    });
    const admin = await Admin.create({
      name,
     user:newUser._id,
    });
    res.status(201).json({
      success: true,
      message: "Admin Register Successfully",
      admin: {
        _id: admin._id,
        name: admin.name,
        user:newUser._id,
        email:newUser.email,
      },
    });
  } catch (error) {
    console.log("Admin Registration Error....", error);
    res.status(500).json({
      success: false,
      message: "Admin Registration Error",
      error: error.message,
    });
  }
};
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Enter both of email and password!!!!!",
        });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "In Valid Email!!!",
      });
    }
    if(user.role !== 'admin'){
        return res.status(403).json({
            success:false,
            message:"You are not authorized as an admin"
        })
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or Password!!!!!",
      });
    }

     user.lastLogin = new Date();
    await user.save();

    const admin = await Admin.findOne({ user: user._id });

    const token = jwt.sign({
        id:user._id,
        role:user.role,
        },
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )
    res.json({

      success: true,
      message: "Login Successfully",
      token,
      admin: {
        _id: admin._id,
        name: admin.name,
        email: user.email,
        userId:user._id,
      },
    });
  } catch (error) {
    console.log("Admin Login Failed", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const userID = req.user._id;
    const admin = await Admin.findOne({user:userID})
    .populate("user", "email role isActive lastLogin createdAt")
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Admin not found" });
    }
   res.status(200).json({
    success:true,
    admin:{
         adminId: admin._id,
        name: admin.name,
        email: admin.user.email,
        role: admin.user.role,
        isActive: admin.user.isActive,
        lastLogin: admin.user.lastLogin,
        createdAt: admin.user.createdAt,
    }
   })
  } catch (error) {
    console.log("Admin Profile Error!!!", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Get Admin Profile Failed!!!",
        error: error.message,
      });
  }
};
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(401).json({
        sucess: false,
        message: "Admin not found",
      });
    }
    if (name) admin.name = name;
    if (email) admin.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }
    const updatedAdmin = await admin.save();
    res.json({
      success: true,
      message: "Admin profile updated Successfully",
      admin: {
        _id: updatedAdmin._id,
        name: updatedAdmin.name,
        email: updatedAdmin.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
