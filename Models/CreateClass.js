import mongoose from 'mongoose'
const scheduleSchema = new mongoose.Schema({
    day:{
        type:String,
        enum:['Monday','Tuesday','Wednesday',"Thrusday",'Friday','Saturday','Sunday'],
        required:true
    },
    startTime:{
        type:String,
        required:true,
    },
    endTime:{
        type:String,
        required:true,
    },
    room:{
        type:String,
        required:true
    }
});
const classSchema = new mongoose.Schema({
  
    className:{
        type:String,
        required:true,
    },
    classCode:{
        type:String,
        required:true,
        unique:true,
        uppercase:true,
        trim:true
    },
    department:{
        type:String,
        required:true,
        index:true
    },
    semester:{
        type:Number,
        required:true,
        min:1,
        max:8
    },
    section:{
        type:String,
        enum:['A','B','Morning','Evening'],
        required:true,
        default:'A'
    },
    academicYear:{
        type:String,
        required:true,
        default:()=>{
            const year = new Date().getFullYear();
            return `${year}-${year+4}`;
        }
    },
    subject:{
        type:String,
        required:true,
    },
    creditHours:{
        type:Number,
        required:true,
        min:1,
        max:4,
        default:3
    },
    teachers:[{
       teacher:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Faculty',
        required:true,
       },
       role:{
        type:String,
        enum:['Assistant' , 'Associate' , 'Visiting', 'Permanent' , 'Lecturer' , 'Lab_Attendant','Professor'],
        required:true
       },
       assignedDate:{
        type:Date,
        default:Date.now
        
       },
    }],
    students:[{
        student:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Student',
            required:true,
        },
        enrollmentDate:{
               type: Date,
            default: Date.now
        },
         status: {
            type: String,
            enum: ['enrolled', 'dropped', 'completed'],
            default: 'enrolled'
        }
    }
    ],
    schedule:[scheduleSchema],
    capacity:{
        type:Number,
        required:true,
        min:1,
        max:70,
        default:50
    },
    enrolledCount:{
        type:Number,
        default:0
    },
    isActive:{
        type:Boolean,
        required:true,
        default:true,
    },
   
},
 {timestamps:true},
);

classSchema.index({department:1, semester:1 ,isActive:1 });
classSchema.index({'teachers.teacher':1});
classSchema.index({'students.student':1});
classSchema.index({classCode:1},{unique:true});

classSchema.pre('save', function(next){
 this.enrolledCount = this.students.filter(s => s.status === 'enrolled').length;
 next();
})
export default mongoose.model("Class" , classSchema);

