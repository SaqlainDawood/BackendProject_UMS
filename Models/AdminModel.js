import mongoose from "mongoose";

const AdminSchema = mongoose.Schema({
    name:{
        type:String , 
        required:true,
        trim:true,
    },
    user:{
         type:mongoose.Schema.Types.ObjectId,
             ref:'User',
              required:true,
    }
},   {timestamps:true}
)
export default mongoose.model('Admin' , AdminSchema);