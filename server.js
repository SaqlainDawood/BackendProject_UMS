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
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;


// Connect DB
ConnectDB();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin:[
         "https://student-teacher-portal-ums.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
    ],
    methods:['GET', 'POST','PUT','DELETE','OPTIONS'],
    allowedHeaders:['Content-Type','Authorization'],
    credentials:true,
}));
 
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
app.use('/api/faculty' , FacultyRoutes)
// Faculty Portal Side Routes
app.use('/api/faculty/portal' , FacultyPortal);
// Student
app.use('/api/students' , StudentRoutes);

app.listen(PORT,()=>{
    console.log(`Server is Started at http://localhost:${PORT}`)
})
