import express from 'express';
import mongoose from 'mongoose';
import Attendance from '../../../Models/Attendance.js';
import Class from '../../../Models/CreateClass.js';
import Student from '../../../Models/StudentModel.js';
import Faculty from '../../../Models/TeacherModel.js';
import User from '../../../Models/userModel.js';
// ==================== SCREEN 1: OVERVIEW ====================
// GET /api/admin/attendance/overview
export const Overview = async (req, res) => {
  try {
    // Get all active classes
    const classes = await Class.find({ isActive: true });
    const classIds = classes.map(c => c._id);

    // Get all attendance records
    const attendanceRecords = await Attendance.find({
      classId: { $in: classIds }
    });

    // Get all students (from all classes)
    const allStudents = [];
    for (const cls of classes) {
      for (const enrollment of cls.students) {
        if (enrollment.status === 'enrolled') {
          allStudents.push(enrollment.student.toString());
        }
      }
    }
    const uniqueStudents = [...new Set(allStudents)];
    const totalStudents = uniqueStudents.length;

    // Calculate overall attendance percentage
    let totalPresent = 0;
    attendanceRecords.forEach(record => {
      if (record.status === 'present') totalPresent++;
    });

    const overallAttendance = attendanceRecords.length > 0 
      ? ((totalPresent / attendanceRecords.length) * 100).toFixed(1)
      : 0;

    // Calculate students below thresholds
    const studentAttendanceMap = new Map();

    attendanceRecords.forEach(record => {
      const studentId = record.studentId.toString();
      if (!studentAttendanceMap.has(studentId)) {
        studentAttendanceMap.set(studentId, { present: 0, total: 0 });
      }
      const stats = studentAttendanceMap.get(studentId);
      stats.total++;
      if (record.status === 'present') stats.present++;
    });

    let studentsBelow75 = 0;
    let studentsBelow60 = 0;

    for (let stats of studentAttendanceMap.values()) {
      const percentage = (stats.present / stats.total) * 100;
      if (percentage < 75) studentsBelow75++;
      if (percentage < 60) studentsBelow60++;
    }

    // Department-wise breakdown (using department string from Class)
    const departments = [...new Set(classes.map(c => c.department))];
    const departmentStats = [];

    for (const deptName of departments) {
      const deptClasses = classes.filter(c => c.department === deptName);
      const deptClassIds = deptClasses.map(c => c._id);
      
      const deptAttendance = await Attendance.find({
        classId: { $in: deptClassIds }
      });

      let deptPresent = 0;
      deptAttendance.forEach(record => {
        if (record.status === 'present') deptPresent++;
      });

      const deptAttendancePercentage = deptAttendance.length > 0
        ? ((deptPresent / deptAttendance.length) * 100).toFixed(1)
        : 0;

      departmentStats.push({
        departmentName: deptName,
        attendance: deptAttendancePercentage,
        status: deptAttendancePercentage >= 80 ? 'Good' 
                : deptAttendancePercentage >= 70 ? 'Average' 
                : 'Alert'
      });
    }

    // Courses needing attention (attendance below 75%)
    const coursesNeedingAttention = [];

    for (const cls of classes) {
      const classAttendance = await Attendance.find({
        classId: cls._id
      });

      let classPresent = 0;
      classAttendance.forEach(record => {
        if (record.status === 'present') classPresent++;
      });

      const classPercentage = classAttendance.length > 0
        ? ((classPresent / classAttendance.length) * 100).toFixed(1)
        : 0;

      if (classPercentage < 75) {
        coursesNeedingAttention.push({
          classId: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          subject: cls.subject,
          department: cls.department,
          attendance: classPercentage,
          status: classPercentage < 60 ? 'Critical' : 'Warning'
        });
      }
    }

    res.json({
      success: true,
      data: {
        universityStats: {
          totalStudents,
          overallAttendance,
          studentsBelow75,
          studentsBelow60
        },
        departmentStats,
        coursesNeedingAttention: coursesNeedingAttention.slice(0, 5)
      }
    });

  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SCREEN 2: DEPARTMENT VIEW ====================
// GET /api/admin/attendance/department/:departmentName
export const getDepartmentAttendance = async (req, res) => {
  try {
    const { departmentName } = req.params;

    // Get all classes in this department
    const classes = await Class.find({ 
      department: departmentName,
      isActive: true 
    });

    const classIds = classes.map(c => c._id);

    // Get all attendance records for these classes
    const attendanceRecords = await Attendance.find({
      classId: { $in: classIds }
    });

    // Get all students in this department
    const allStudents = [];
    for (const cls of classes) {
      for (const enrollment of cls.students) {
        if (enrollment.status === 'enrolled') {
          allStudents.push(enrollment.student.toString());
        }
      }
    }
    const uniqueStudents = [...new Set(allStudents)];
    const totalStudents = uniqueStudents.length;

    // Calculate department overall attendance
    let totalPresent = 0;
    attendanceRecords.forEach(record => {
      if (record.status === 'present') totalPresent++;
    });

    const deptAttendance = attendanceRecords.length > 0
      ? ((totalPresent / attendanceRecords.length) * 100).toFixed(1)
      : 0;

    // Calculate students below 75%
    const studentAttendanceMap = new Map();

    attendanceRecords.forEach(record => {
      const studentId = record.studentId.toString();
      if (!studentAttendanceMap.has(studentId)) {
        studentAttendanceMap.set(studentId, { present: 0, total: 0 });
      }
      const stats = studentAttendanceMap.get(studentId);
      stats.total++;
      if (record.status === 'present') stats.present++;
    });

    let studentsBelow75 = 0;
    for (let stats of studentAttendanceMap.values()) {
      const percentage = (stats.present / stats.total) * 100;
      if (percentage < 75) studentsBelow75++;
    }

    // Calculate courses below 75%
    let coursesBelow75 = 0;
    const courseWiseData = [];

    for (const cls of classes) {
      const classAttendance = await Attendance.find({
        classId: cls._id
      });

      let classPresent = 0;
      classAttendance.forEach(record => {
        if (record.status === 'present') classPresent++;
      });

      const classPercentage = classAttendance.length > 0
        ? ((classPresent / classAttendance.length) * 100).toFixed(1)
        : 0;

      if (classPercentage < 75) coursesBelow75++;

      // Get teacher name
      let teacherName = 'Not Assigned';
      if (cls.teachers && cls.teachers.length > 0) {
        const teacher = await Faculty.findById(cls.teachers[0].teacher);
        if (teacher) {
          teacherName = `${teacher.firstName} ${teacher.lastName}`;
        }
      }

      courseWiseData.push({
        classId: cls._id,
        classCode: cls.classCode,
        className: cls.className,
        subject: cls.subject,
        teacher: teacherName,
        section: cls.section,
        attendance: classPercentage,
        status: classPercentage >= 80 ? 'Good' 
                : classPercentage >= 70 ? 'Warning' 
                : 'Critical'
      });
    }

    // Get at-risk students (below 75%) with their weak courses
    const atRiskStudents = [];
    
    for (const studentId of uniqueStudents) {
      const student = await Student.findById(studentId);
      if (!student) continue;

      const studentAttendance = await Attendance.find({
        studentId: student._id,
        classId: { $in: classIds }
      });

      if (studentAttendance.length > 0) {
        let studentPresent = 0;
        studentAttendance.forEach(record => {
          if (record.status === 'present') studentPresent++;
        });
        
        const percentage = (studentPresent / studentAttendance.length) * 100;
        
        if (percentage < 75) {
          // Find which courses they are struggling in
          const courseAttendanceMap = new Map();
          studentAttendance.forEach(record => {
            const classId = record.classId.toString();
            if (!courseAttendanceMap.has(classId)) {
              courseAttendanceMap.set(classId, { present: 0, total: 0 });
            }
            const stats = courseAttendanceMap.get(classId);
            stats.total++;
            if (record.status === 'present') stats.present++;
          });

          const weakCourses = [];
          for (let [classId, stats] of courseAttendanceMap) {
            const coursePercentage = (stats.present / stats.total) * 100;
            if (coursePercentage < 75) {
              const cls = classes.find(c => c._id.toString() === classId);
              if (cls) {
                weakCourses.push(cls.classCode);
              }
            }
          }

          atRiskStudents.push({
            studentId: student._id,
            rollNo: student.rollNo || 'N/A',
            name: `${student.firstName} ${student.lastName}`,
            attendance: percentage.toFixed(1),
            weakCourses: weakCourses.join(', ') || 'All courses'
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        department: {
          name: departmentName,
          classCount: classes.length,
          studentCount: totalStudents
        },
        stats: {
          overallAttendance: deptAttendance,
          studentsBelow75,
          coursesBelow75
        },
        courses: courseWiseData,
        atRiskStudents: atRiskStudents.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Error fetching department attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ==================== SCREEN 3: COURSE/CLASS VIEW ====================
// GET /api/admin/attendance/class/:classId
export const getClassAttendance = async(req, res) => {
  try {
    const { classId } = req.params;

    // Get class details
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get teacher info
    let teacherInfo = null;
    if (classData.teachers && classData.teachers.length > 0) {
      teacherInfo = await Faculty.findById(classData.teachers[0].teacher);
    }

    // Get all students enrolled in this class
    const enrolledStudents = classData.students.filter(s => s.status === 'enrolled');
    const studentIds = enrolledStudents.map(s => s.student);
    
    const students = await Student.find({ _id: { $in: studentIds } });

    // Get all attendance records for this class
    const attendanceRecords = await Attendance.find({
      classId
    }).sort({ date: -1 });

    // Calculate statistics
    const totalStudents = students.length;
    
    // Get unique dates for total classes count
    const uniqueDates = [...new Set(attendanceRecords.map(r => 
      r.date.toISOString().split('T')[0]
    ))];
    const totalClasses = uniqueDates.length;

    let totalPresent = 0;
    attendanceRecords.forEach(record => {
      if (record.status === 'present') totalPresent++;
    });

    const averageAttendance = attendanceRecords.length > 0
      ? ((totalPresent / attendanceRecords.length) * 100).toFixed(1)
      : 0;

    // Student-wise statistics
    const studentStats = [];
    let studentsAbove90 = 0;
    let studentsBelow75 = 0;

    for (const student of students) {
      const studentAttendance = attendanceRecords.filter(
        r => r.studentId.toString() === student._id.toString()
      );

      if (studentAttendance.length > 0) {
        let present = 0;
        studentAttendance.forEach(r => {
          if (r.status === 'present') present++;
        });
        
        const percentage = (present / studentAttendance.length) * 100;
        
        if (percentage >= 90) studentsAbove90++;
        if (percentage < 75) studentsBelow75++;

        studentStats.push({
          studentId: student._id,
          rollNo: student.rollNo || 'N/A',
          name: `${student.firstName} ${student.lastName}`,
          present: present,
          total: studentAttendance.length,
          percentage: percentage.toFixed(1),
          status: percentage >= 75 ? 'Good' : 'Warning'
        });
      } else {
        studentStats.push({
          studentId: student._id,
          rollNo: student.rollNo || 'N/A',
          name: `${student.firstName} ${student.lastName}`,
          present: 0,
          total: 0,
          percentage: '0',
          status: 'Warning'
        });
        studentsBelow75++;
      }
    }

    // Class-wise breakdown (by date)
    const classWiseData = [];
    for (const date of uniqueDates) {
      const dayRecords = attendanceRecords.filter(r => 
        r.date.toISOString().split('T')[0] === date
      );
      
      let present = 0;
      dayRecords.forEach(r => {
        if (r.status === 'present') present++;
      });

      classWiseData.push({
        date,
        present,
        total: dayRecords.length,
        rate: ((present / dayRecords.length) * 100).toFixed(1)
      });
    }

    // Sort by date descending
    classWiseData.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        class: {
          id: classData._id,
          code: classData.classCode,
          name: classData.className,
          subject: classData.subject,
          section: classData.section,
          semester: classData.semester,
          department: classData.department,
          teacher: teacherInfo ? `${teacherInfo.firstName} ${teacherInfo.lastName}` : 'Not Assigned',
          schedule: classData.schedule,
          totalStudents
        },
        stats: {
          averageAttendance,
          totalClasses,
          studentsAbove90,
          studentsBelow75
        },
        classWise: classWiseData.slice(0, 10),
        students: studentStats.sort((a, b) => parseFloat(a.percentage) - parseFloat(b.percentage))
      }
    });

  } catch (error) {
    console.error('Error fetching class attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// ==================== SCREEN 4: STUDENT VIEW ====================
// GET /api/admin/attendance/student/:studentId
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Find all classes this student is enrolled in
    const allClasses = await Class.find({
      'students.student': studentId,
      'students.status': 'enrolled',
      isActive: true
    });

    // Get all attendance records for this student
    const attendanceRecords = await Attendance.find({
      studentId
    }).sort({ date: -1 });

    // Calculate overall attendance
    let totalPresent = 0;
    attendanceRecords.forEach(record => {
      if (record.status === 'present') totalPresent++;
    });

    const overallAttendance = attendanceRecords.length > 0
      ? ((totalPresent / attendanceRecords.length) * 100).toFixed(1)
      : 0;

    // Course-wise attendance
    const courseWiseAttendance = [];

    for (const cls of allClasses) {
      const courseRecords = attendanceRecords.filter(
        r => r.classId.toString() === cls._id.toString()
      );

      if (courseRecords.length > 0) {
        let present = 0;
        courseRecords.forEach(r => {
          if (r.status === 'present') present++;
        });

        const percentage = (present / courseRecords.length) * 100;

        // Get teacher name
        let teacherName = 'Not Assigned';
        if (cls.teachers && cls.teachers.length > 0) {
          const teacher = await Faculty.findById(cls.teachers[0].teacher);
          if (teacher) {
            teacherName = `${teacher.firstName} ${teacher.lastName}`;
          }
        }

        courseWiseAttendance.push({
          classId: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          subject: cls.subject,
          section: cls.section,
          teacher: teacherName,
          present,
          total: courseRecords.length,
          percentage: percentage.toFixed(1),
          status: percentage >= 75 ? 'Good' : 'Warning'
        });
      } else {
        let teacherName = 'Not Assigned';
        if (cls.teachers && cls.teachers.length > 0) {
          const teacher = await Faculty.findById(cls.teachers[0].teacher);
          if (teacher) {
            teacherName = `${teacher.firstName} ${teacher.lastName}`;
          }
        }

        courseWiseAttendance.push({
          classId: cls._id,
          classCode: cls.classCode,
          className: cls.className,
          subject: cls.subject,
          section: cls.section,
          teacher: teacherName,
          present: 0,
          total: 0,
          percentage: '0',
          status: 'Warning'
        });
      }
    }

    // Absence history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAbsences = [];
    const absenceRecords = attendanceRecords
      .filter(r => r.status !== 'present' && new Date(r.date) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const record of absenceRecords.slice(0, 20)) {
      const cls = await Class.findById(record.classId);
      if (cls) {
        recentAbsences.push({
          date: record.date,
          classCode: cls.classCode,
          className: cls.className,
          subject: cls.subject,
          status: record.status,
          remarks: record.remarks || 'No reason'
        });
      }
    }

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          rollNo: student.rollNo || 'N/A',
          name: `${student.firstName} ${student.lastName}`,
          email: student.user ? 'Fetch from User' : 'Not available',
          department: student.enrollment?.department || 'N/A',
          program: student.enrollment?.program || 'N/A',
          semester: student.enrollment?.semester || 'N/A'
        },
        stats: {
          overallAttendance,
          totalClasses: attendanceRecords.length,
          totalPresent,
          totalAbsent: attendanceRecords.length - totalPresent
        },
        courseWise: courseWiseAttendance,
        absenceHistory: recentAbsences
      }
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}