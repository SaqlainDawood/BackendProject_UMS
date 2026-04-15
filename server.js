import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './Config/ConnectDB.js'
import StudentRoutes from './Routes/StudentRoute.js'
import FacultyRoutes from './Routes/TeacherRoutes.js'
import FacultyPortal from './Routes/TPRoutes/TPSideRoutes.js'
import AdminRoutes from './Routes/AdminRoutes.js'
import AdminStatistics from './Routes/AdminStats/AdminStats.js'
import AdminStudentVUD from './Routes/AdminStats/StudentVUD.js'
import AdminCoordinator from './Routes/AdminCoordinator/RegisterCoordinator.js'
import classRoute from './Routes/AdminClassRoutes/AdminClassesCRUD.js'
import adminAttendance from './Routes/AdminAttendance/Attendance.js'
import FacultyPortalAttendance from './Routes/TPRoutes/facultyAttendanceRoutes.js'
import StudentAttendance from './Routes/StudentPortal/studentRoutes.js'
import studentEnrollmentRoutes from './Routes/AdminClassRoutes/studentEnrollmentRoutes.js'
import activityRoutes from './Routes/TPRoutes/activityRoutes.js'
import gradingRoutes from './Routes/TPRoutes/gradingRoutes.js'
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;


// Connect DB
ConnectDB();
app.use(cors({
    origin:[
         "https://studentteacherportal-j7yl2fvuj-saqlain-dawoods-projects.vercel.app",
         'https://studentteacherportal.vercel.app',
          "https://admin-pannel-black.vercel.app",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
    ],
    methods:['GET', 'POST','PUT','DELETE','OPTIONS'],
    allowedHeaders:['Content-Type','Authorization'],
    credentials:true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/' , (req , res)=>{
    res.send("Welcome to the express")
})
// Admin
app.use('/api/admin/student',AdminStudentVUD);
app.use('/api/admin' , AdminRoutes)
// Admin Statistics
app.use('/api/admin/stats' , AdminStatistics);
// Admin Register Coordinator
app.use('/api/admin/coordinator' , AdminCoordinator)
// Admin Side Faculty.
app.use('/api/admin/faculty' , FacultyRoutes);
// Faculty Portal Side Routes
app.use('/api/faculty/portal' , FacultyPortal);
app.use('/api/faculty/portal/activities', activityRoutes);
app.use('/api/facult/portal/grading', gradingRoutes);
// Student
app.use('/api/students' , StudentRoutes);
app.use('/api/students/attendance', StudentAttendance); 
// Classes Assign for admin side
app.use('/api/admin/classes', classRoute);
app.use('/api/admin/classes',studentEnrollmentRoutes);
// Attendance System admin side view
app.use('/api/admin/attendance' , adminAttendance);
// Facutly Portal Attendance
app.use('/api/faculty/portal' , FacultyPortalAttendance)


app.listen(PORT,()=>{
    console.log(`Server is Started at http://localhost:${PORT}`);
})
