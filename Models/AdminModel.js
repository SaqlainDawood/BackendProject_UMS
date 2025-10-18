import mongoose from "mongoose";

const AdminSchema = mongoose.Schema({
    name:{
        type:String , 
        required:true,
        trim:true,
    },
    email:{
        type:String,
        unique:true,
        required:true,
        lowercase:true,
    },
     password:{
        type:String,
        required:true,
     },
     role:{
        type:String,
        default:'admin',
     },

},   {timestamps:true}
)
export default mongoose.model('Admin' , AdminSchema);