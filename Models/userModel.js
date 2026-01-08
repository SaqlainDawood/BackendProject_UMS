import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    email:{
        type:String ,
        required:true,
        unique:true,
        lowercase: true, 
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    
    },
    password:{
        type:String,
        // required:true,
          default:null,
         minlength: [6, 'Password must be at least 6 characters'],
       
    },
    role:{
        type:String,
        enum:["student", "faculty", "admin", "coordinator"],
        required:true,
    },
     isActive: {
        type: Boolean,
        default: true
    },
    isDeleted:{
        type:Boolean,
        default:false,
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    lastLogin:{
        type:Date,
    },
})

export default mongoose.model("User" , userSchema);