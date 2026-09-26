import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import ConnectDB from './Config/ConnectDB.js'
import AuthRoutes from './Routes/Auth/authRoutes.js'
import EnrollmentRoutes from './Routes/students_Enrollments/routes.js';
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
    methods:['GET', 'POST','PUT','DELETE','OPTIONS', 'PATCH' ,'PUT', 'HEAD', 'CONNECT', 'TRACE', 'COPY', 'LOCK', 'UNLOCK', 'SEARCH', 'MKCOL', 'MOVE', 'PROPFIND', 'PROPPATCH', 'REPORT', 'CHECKOUT', 'MERGE', 'M-SEARCH', 'NOTIFY', 'SUBSCRIBE', 'UNSUBSCRIBE',],
    allowedHeaders:['Content-Type','Authorization'],
    credentials:true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/' , (req , res)=>{
    res.send("Welcome to the express")
})

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is awake",
    timestamp: new Date().toISOString(),
  });
});

// auth routes
app.use('/api/auth' , AuthRoutes);
app.use("/api/students", studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api', EnrollmentRoutes);
app.use("/api/cms", cmsRoutes);

app.use((err, req, res, next) => {
  console.error("UNHANDLED ERROR:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const startServer = async () => {
  try {
    await ConnectDB();
    app.listen(PORT, () => {
      console.log(`Server is Started at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to DB:", err?.message || err);
    process.exit(1);
  }
};

startServer();