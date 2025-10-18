import Admin from '../../Models/AdminModel.js'
import bcrypt from 'bcryptjs'
import generatToken from '../../utils/token.js';
export const adminRegister = async(req , res)=>{
    try {
        const {name , email , password} = req.body;
        if(!name || !email || !password){
          return res.status(400).json({success:false , message:"Please enter all the fields....."});
        }
        const existingAdmin = await Admin.findOne({email});
        if(existingAdmin){
         return res.status(401).json({
                success:false ,
                message:"Admin is already Register please Login!!!!"
            }) 
        }
        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password , salt);
        const admin = await Admin.create({
            name,
            email,
            password:hashPassword,
        });
        res.status(201).json({
            success:true,
            message:"Admin Register Successfully",
            admin:{
                _id:admin._id,
                name:admin.name,
                password:admin.password
            }
        })
    } catch (error) {
        console.log("Admin Registration Error...." , error)
        res.status(500).json({
            success:false,
            message:"Admin Registration Error",
            error:error.message,
        })
    }
}

export const adminLogin = async(req ,res) =>{
    try {
        const {email , password} = req.body;
        if(!email || !password){
           return res.status(400).json({success:false , message:"Enter both of email and password!!!!!"})
        }
        const admin = await Admin.findOne({email});
        if(!admin){
           return res.status(401).json({
                success:false,
                message:"Email does not exist",
            })
        }

        const isMatch = await bcrypt.compare(password , admin.password)
        if(!isMatch){
            return res.status(401).json({
                success:false,
                message:"Invalid Password!!!!!",
            }) 
        }
        const token = generatToken(admin._id);
        res.json({
            success:true,
            message:"Login Successfully",
            token,
            admin:{
                _id:admin._id,
                name:admin.name,
                email:admin.email,
            }
        })

        } catch (error) {
        console.log("Admin Login Failed");
        res.status(500).json({success:false
            ,error:error.message});
    }
}

export const getAdminProfile =async(req , res)=>{
    try {
        const admin = await Admin.findById(req.admin._id).select("-password")
        if(!admin){
            return res.status(401).json({success:false ,
                message:"Admin not found",
            })
        }
        res.json({succss:true, admin});

    } catch (error) {
        console.log("Admin Profile Error!!!", error);
        res.status(500).json({success:false , message:"Get Admin Profile Failed!!!" , error:error.message});
    }
}
export const updateAdminProfile = async(req ,res)=>{
    try {
        const {name , email , password} = req.body;
        const admin = await Admin.findById(req.admin._id);
        if(!admin){
            return res.status(401).json({
                sucess:false,
                message:"Admin not found",
            })
        }
        if(name) admin.name = name;
        if(email) admin.email = email;
        if(password){
            const salt=await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password , salt);
        }
        const updatedAdmin = await admin.save();
        res.json({
            success:true,
            message:"Admin profile updated Successfully",
            admin:{
                _id:updatedAdmin._id,
                name:updatedAdmin.name,
                email:updatedAdmin.email,
            },
        })

    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

