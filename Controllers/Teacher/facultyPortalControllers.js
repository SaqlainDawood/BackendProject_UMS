import User from "../../Models/userModel.js";
import Faculty from "../../Models/TeacherModel.js";
import Class from '../../Models/CreateClass.js';
import mongoose from 'mongoose'
export const fetchFacultyProfile = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.faculty._id).populate(
      "user",
      "email role lastLogin"
    );
    if (!faculty) {
      return res.status(404).json({
        success: false,
        mesasge: "User not found",
      });
    }
    res.json({
      success: true,
      faculty: faculty,
    });
  } catch (error) {
    console.log("Error for fetching the faculty Profile.", error);
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const getFacultyDashboard = async (req, res) => {
  try {
    const { facultyId } = req.params;
    
    // Validate faculty ID
    if (!mongoose.Types.ObjectId.isValid(facultyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid faculty ID format"
      });
    }

    // Get faculty details
    const faculty = await Faculty.findById(facultyId)
      .populate('user', 'email')
      .select('firstName lastName employeeID department designation profileImage');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found"
      });
    }

    // Get all classes assigned to this faculty
    const assignedClasses = await Class.find({
      'teachers.teacher': facultyId,
      isActive: true
    })
    .populate({
      path: 'teachers.teacher',
      model: 'Faculty',
      select: 'firstName lastName'
    })
    .populate({
      path: 'students.student',
      model: 'Student',
      select: 'firstName lastName rollNo'
    })
    .select('className classCode department semester section subject creditHours schedule students enrolledCount capacity academicYear');

    // Calculate statistics
    const totalClasses = assignedClasses.length;
    const totalCreditHours = assignedClasses.reduce((sum, cls) => sum + (cls.creditHours || 0), 0);
    const totalStudents = assignedClasses.reduce((sum, cls) => sum + (cls.enrolledCount || 0), 0);
    
    // Group by department
    const departmentStats = {};
    assignedClasses.forEach(cls => {
      if (!departmentStats[cls.department]) {
        departmentStats[cls.department] = {
          department: cls.department,
          classCount: 0,
          totalStudents: 0,
          totalCreditHours: 0,
          classes: []
        };
      }
      departmentStats[cls.department].classCount++;
      departmentStats[cls.department].totalStudents += cls.enrolledCount || 0;
      departmentStats[cls.department].totalCreditHours += cls.creditHours || 0;
      departmentStats[cls.department].classes.push(cls);
    });

    // Group by semester
    const semesterStats = {};
    assignedClasses.forEach(cls => {
      const semesterKey = `Semester ${cls.semester}`;
      if (!semesterStats[semesterKey]) {
        semesterStats[semesterKey] = {
          semester: cls.semester,
          classCount: 0,
          totalStudents: 0,
          totalCreditHours: 0,
          classes: []
        };
      }
      semesterStats[semesterKey].classCount++;
      semesterStats[semesterKey].totalStudents += cls.enrolledCount || 0;
      semesterStats[semesterKey].totalCreditHours += cls.creditHours || 0;
      semesterStats[semesterKey].classes.push(cls);
    });

    // Get today's schedule
    const today = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[today.getDay()];
    const currentTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const todaysClasses = [];
    assignedClasses.forEach(cls => {
      cls.schedule.forEach(slot => {
        if (slot.day === currentDay) {
          todaysClasses.push({
            ...slot,
            className: cls.className,
            classCode: cls.classCode,
            subject: cls.subject,
            section: cls.section,
            semester: cls.semester,
            department: cls.department,
            enrolledCount: cls.enrolledCount,
            capacity: cls.capacity
          });
        }
      });
    });
    
    // Sort today's classes by time
    todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Format class list for table
    const classList = assignedClasses.map((cls, index) => ({
      id: cls._id,
      serialNo: index + 1,
      className: cls.className,
      classCode: cls.classCode,
      subject: cls.subject,
      department: cls.department,
      semester: cls.semester,
      section: cls.section,
      creditHours: cls.creditHours,
      enrolledStudents: cls.enrolledCount,
      capacity: cls.capacity,
      academicYear: cls.academicYear,
      schedule: cls.schedule.map(s => ({
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room
      }))
    }));

    const dashboardData = {
      facultyInfo: {
        name: `${faculty.firstName} ${faculty.lastName}`,
        employeeID: faculty.employeeID,
        department: faculty.department,
        designation: faculty.designation,
        email: faculty.user?.email,
        profileImage: faculty.profileImage
      },
      statistics: {
        totalClasses,
        totalCreditHours,
        totalStudents,
        averageClassSize: totalClasses > 0 ? Math.round(totalStudents / totalClasses) : 0
      },
      departmentStats: Object.values(departmentStats),
      semesterStats: Object.values(semesterStats).sort((a, b) => a.semester - b.semester),
      todaysClasses,
      classList,
      totalClassesCount: classList.length
    };

    res.status(200).json({
      success: true,
      message: "Faculty dashboard data fetched successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error("Error fetching faculty dashboard:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard data"
    });
  }
};