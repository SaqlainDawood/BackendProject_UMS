import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './Config/ConnectDB.js'
import FacultyRoutes from './Routes/TeacherRoutes.js'
import FacultyPortal from './Routes/TPRoutes/TPSideRoutes.js'
import AuthRoutes from './Routes/Auth/authRoutes.js'
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
import studentActivityRoutes from './Routes/StudentPortal/studentActivityRoutes.js';
import EnrollmentRoutes from './Routes/students_Enrollments/routes.js';
import academicsRoutes from './Routes/Admin/Academics/routes.js';
import subjectRoutes from './Routes/subject/routes.js';
import studentPortalRoutes from "./Routes/StudentPortal/StudentPortal.routes.js";
import cmsRoutes from "./Routes/CMS/index.js";
import staffRoutes from "./Routes/Staff/index.routes.js";
import studentRoutes from "./Routes/Student/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;


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

// auth routes
app.use('/api/auth' , AuthRoutes);
// Admin
app.use('/api/admin/student',AdminStudentVUD);
//student routes
app.use("/api/students", studentRoutes);
// Staff Routes
app.use('/api/staff', staffRoutes);

app.use('/api/admin/stats' , AdminStatistics);
// Admin Register Coordinator
app.use('/api/admin/coordinator' , AdminCoordinator)
// Admin Side Faculty.
app.use('/api/admin/faculty' , FacultyRoutes);
// Faculty Portal Side Routes
app.use('/api/faculty/portal' , FacultyPortal);
app.use('/api/faculty/activities', activityRoutes);
app.use('/api/faculty/grading', gradingRoutes);
// Student

app.use('/api/student', studentActivityRoutes);
app.use('/api/students/attendance', StudentAttendance); 
// Classes Assign for admin side
app.use('/api/admin/classes', classRoute);
app.use('/api/admin/classes',studentEnrollmentRoutes);
// Attendance System admin side view
app.use('/api/admin/attendance' , adminAttendance);
// Facutly Portal Attendance
app.use('/api/faculty/portal' , FacultyPortalAttendance)
//student portal routes
app.use( "/api/student-portal", studentPortalRoutes);

app.use('/api', EnrollmentRoutes);
// app.use('/api', academicsRoutes);
app.use('/api', subjectRoutes); 
// CMS Routes
app.use("/api/cms", cmsRoutes);

app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is awake",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
    console.log(`Server is Started at http://localhost:${PORT}`);
});

ConnectDB().catch((err) => {
    console.error('Failed to connect to DB:', err?.message || err);
});