import jwt from 'jsonwebtoken'

import Student from '../Models/StudentModel.js'

export const protect = async (req , res , next)=>{
        let token;
       if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            try {
                token = req.headers.authorization.split(" ")[1];
                const decoded = jwt.verify(token , process.env.JWT_SECRET)
                req.student = await Student.findById(decoded.id).select("-password");
                 if (!req.student) {
                    return res.status(401).json({ success: false, message: "Student not found" });
                    }
                    next();
            } catch (error) {
             return res.status(401).json({ success: false, message: "Not authorized, token failed" });
            }
        }
        else{
                return res.status(401).json({ success: false, message: "No token, authorization denied" });
        }
}
