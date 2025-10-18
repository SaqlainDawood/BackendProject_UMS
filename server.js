import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './Config/ConnectDB.js'
import StudentRoutes from './Routes/StudentRoute.js'
import FacultyRoutes from './Routes/TeacherRoutes.js'
import AdminRoutes from './Routes/AdminRoutes.js'
import AdminStatistics from './Routes/AdminStats/AdminStats.js'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;


// Connect DB
ConnectDB();
app.use(express.json());
app.use(cors());
 app.use(express.urlencoded({ extended: true }));
app.get('/' , (req , res)=>{
    res.send("Welcome to the express")
})
// Admin
app.use('/api/admin' , AdminRoutes)
// Admin Statistics
app.use('/api/admin/stats' , AdminStatistics);
// Faculty
app.use('/api/faculty' , FacultyRoutes)
// Student
app.use('/api/students' , StudentRoutes);

app.listen(PORT,()=>{
    console.log(`Server is Started at http://localhost:${PORT}`)
})
