import mongoose from 'mongoose'

const classSchema = new mongoose.Schema({
    className:{
        type:String,
        require:true,
    },
    department:{
        type:String,
        required:true,
    },
    semester:{
        type:Number,
        requreid:true,
    },
    teacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Faculty',
        required:true,
    },
    students:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Student',
        }
    ],
    isActive:{
        type:Boolean,
        required:true,
    },
   
},
 {timestamps:true},
);

export default mongoose.model("Class" , classSchema);

