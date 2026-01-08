import bcrypt from 'bcryptjs';
import Faculty from '../../Models/TeacherModel.js';
import User from '../../Models/userModel.js';
import generatToken from '../../utils/token.js';

export const FacultyLogin = async (req, res) => {
    try {
        const { userName, password } = req.body;
        
        if (!userName || !password) {
            return res.status(400).json({
                success: false,
                message: "Please enter both username and password"
            });
        }
        
        // 1. Find faculty by userName
        const faculty = await Faculty.findOne({ userName });
        
        if (!faculty) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }
        
        // 2. Find the associated User document
        const user = await User.findById(faculty.user);
        
         if (!user) {
            return res.status(500).json({
                success: false,
                message: "Account configuration error"
            });
        }
        
        // 3. Check if user has password
        if (!user.password) {
            console.error(`User has no password for faculty: ${faculty.userName}`);
            return res.status(500).json({
                success: false,
                message: "Password not set. Please contact administrator."
            });
        }
        
        // 4. Check if user role is faculty
        if (user.role !== "faculty") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Faculty portal only."
            });
        }
        
        // 5. Check if user is active
        if (!user.isActive || user.isDeleted) {
            return res.status(403).json({
                success: false,
                message: "Account is deactivated. Please contact administrator."
            });
        }
        
        
        const isMatchPass = await bcrypt.compare(password, user.password);
        
        if (!isMatchPass) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }
        
        // 7. Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // 8. Generate token
        const token = generatToken(user._id);
        
        // 9. Send success response
        res.json({
            success: true,
            message: "Login Successful",
            token,
            faculty: {
                _id: faculty._id,
                userName: faculty.userName,
                firstName: faculty.firstName,
                lastName: faculty.lastName,
                email: user.email, // Get email from User document
                profileImage: faculty.profileImage,
                department: faculty.department,
                designation: faculty.designation
            }
        });
        
    } catch (error) {
        console.log("Faculty Login Error", error);
        
        // Handle bcrypt error specifically
        if (error.message.includes("Illegal arguments")) {
            return res.status(500).json({
                success: false,
                message: "Authentication system error. Please contact administrator."
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Faculty Login Failed",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
};