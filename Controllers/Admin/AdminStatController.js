import Student from '../../Models/StudentModel.js'
// in the dashboard total students check. 
export const getTotalStudents = async(req ,res) =>{
    try {
        const totalStudents = await Student.countDocuments();
        res.json({success:true,totalStudents});
    } catch (error) {
        console.log("Get total Students Failed...." , error);
        res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}
// In the studentList page check the total approve rejected students. 

export const getStudentsStats = async(req , res)=>{
    try {
        const totalStudents = await Student.countDocuments();
        const activeStudents = await Student.countDocuments({status:"approved"});
        const suspendStudents = await Student.countDocuments({status:"rejected"});
        const departments = await Student.distinct("enrollment.department")
        const totalDepartments = departments.length;
        res.json({
            success:true,
            totalStudents,
            activeStudents,
            suspendStudents,
            departments:totalDepartments,
        })
    } catch (error) {
        console.log("Get Students Statistics Error" , error)
        res.status(500).json({
            success:false,
            message:error.message,
        })
    }
}

export const getPendingStudents = async(req, res) =>{
        try {
            const pendingStudents = await Student.find({status:"pending"}).select("-password")
            res.status(200).json(pendingStudents);
            console.log("Pending Students Found:", pendingStudents.length);

        } catch (error) {
            console.log("Error in fetching Pending Students" , error);
            res.status(500).json({
                success:false,
                message:"Error Fetching Pending Students.",error
            })
        }
}

export const approveStudents = async(req , res) =>{
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            {status:"approved"},
            {new:true}
        );
        res.status(200).json({success:true,
            message:"Students Approved Successfully", student
        })
    } catch (error) {
        console.log("Approve Students Error....." , error);
        res.status(500).json({
            success:false,
            message:error.message||"Approved Students Error",
        })
    }
}

export const rejectStudent = async(req , res) =>{
    try {
        const {rejectionReason} = req.body;
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            {status:"rejected", rejectionReason},
            {new:true}
        )

        res.status(200).json({
            success:true,
            message:"Student Rejected Successfully",student
        })
    } catch (error) {
        console.log("Rejected Student Error " , error)
        res.status(500).json({
            success:false,
            message:error.message||"Error becomes in rejected students",
        })
    }
}