import mongoose from 'mongoose';
import Attendance from '../../Models/Attendance.js';
import Class from '../../Models/CreateClass.js';
import Student from '../../Models/StudentModel.js';

// ==================== GET STUDENT ATTENDANCE SUMMARY ====================
export const getStudentAttendanceSummary = async (req, res) => {
  try {
    // Get student from auth middleware
    const student = req.student;
    
   if (!student) {
      console.log(' No student in req.student');
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found in request' 
      });
    }

    console.log('Student found:', student._id, student.firstName, student.lastName);

    // Get all classes this student is enrolled in
    const enrolledClasses = await Class.find({
      'students.student': student._id,
      'students.status': 'enrolled',
      isActive: true
    }).populate('teachers.teacher', 'firstName lastName');

   if (enrolledClasses.length === 0) {
  return res.status(200).json({
    success: true,
    data: {
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        rollNo: student.rollNo || 'N/A',
        email: student.user?.email,
        program: student.enrollment?.program || 'N/A',
        semester: student.enrollment?.semester || 'N/A',
        department: student.enrollment?.department || 'N/A',
        profileImage: student.profileImage?.url
      },
      stats: {  
        overallAttendance: 0,
        totalClasses: 0,
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0
      },
      courses: [],
      recentAttendance: [],
      monthlySummary: []
    }
  });
}
    const classIds = enrolledClasses.map(c => c._id);

    // Get all attendance records for this student
    const attendanceRecords = await Attendance.find({
      studentId: student._id,
      classId: { $in: classIds }
    }).sort({ date: -1 });

    // Calculate overall stats
    const totalClasses = attendanceRecords.length;
    const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
    const totalLate = attendanceRecords.filter(r => r.status === 'late').length;
    const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
    const overallAttendance = totalClasses > 0 
      ? ((totalPresent + totalLate) / totalClasses * 100).toFixed(1) 
      : 0;

    // Course-wise attendance
    const courseWiseAttendance = [];

    for (const cls of enrolledClasses) {
      const courseRecords = attendanceRecords.filter(
        r => r.classId.toString() === cls._id.toString()
      );

      const total = courseRecords.length;
      const present = courseRecords.filter(r => r.status === 'present').length;
      const late = courseRecords.filter(r => r.status === 'late').length;
      const absent = courseRecords.filter(r => r.status === 'absent').length;
      const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

      // Get teacher name
      let teacherName = 'Not Assigned';
      if (cls.teachers && cls.teachers.length > 0) {
        const teacher = cls.teachers[0].teacher;
        teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned';
      }

      courseWiseAttendance.push({
        classId: cls._id,
        classCode: cls.classCode,
        className: cls.className,
        subject: cls.subject,
        section: cls.section,
        semester: cls.semester,
        department: cls.department,
        creditHours: cls.creditHours,
        teacher: teacherName,
        total,
        present,
        late,
        absent,
        percentage,
        status: percentage >= 75 ? 'Good' : percentage >= 60 ? 'Warning' : 'Critical'
      });
    }

    // Get recent attendance (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAttendance = [];
    const recentRecords = attendanceRecords
      .filter(r => new Date(r.date) >= thirtyDaysAgo)
      .slice(0, 20);

    for (const record of recentRecords) {
      const cls = enrolledClasses.find(c => c._id.toString() === record.classId.toString());
      if (cls) {
        recentAttendance.push({
          date: record.date,
          classCode: cls.classCode,
          className: cls.className,
          subject: cls.subject,
          status: record.status,
          remarks: record.remarks || ''
        });
      }
    }

    // Get monthly summary (last 6 months)
    const monthlySummary = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthRecords = attendanceRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= month && recordDate <= monthEnd;
      });
      
      const monthTotal = monthRecords.length;
      const monthPresent = monthRecords.filter(r => r.status === 'present').length;
      const monthLate = monthRecords.filter(r => r.status === 'late').length;
      const monthPercentage = monthTotal > 0 
        ? ((monthPresent + monthLate) / monthTotal * 100).toFixed(1) 
        : 0;
      
      monthlySummary.push({
        month: month.toLocaleString('default', { month: 'short', year: 'numeric' }),
        percentage: monthPercentage,
        total: monthTotal,
        present: monthPresent,
        late: monthLate,
        absent: monthTotal - monthPresent - monthLate
      });
    }
 console.log('✅ Sending response with', courseWiseAttendance.length, 'courses');
    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          rollNo: student.rollNo || 'N/A',
          email: student.user?.email,
          program: student.enrollment?.program || 'N/A',
          semester: student.enrollment?.semester || 'N/A',
          department: student.enrollment?.department || 'N/A',
          profileImage: student.profileImage?.url
        },
        stats: {
          overallAttendance,
          totalClasses,
          totalPresent,
          totalLate,
          totalAbsent
        },
        courses: courseWiseAttendance.sort((a, b) => a.percentage - b.percentage),
        recentAttendance,
        monthlySummary
      }
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET STUDENT ATTENDANCE BY COURSE ====================
export const getStudentCourseAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const student = req.student;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class ID' });
    }

    // Get course details
    const course = await Class.findById(classId)
      .populate('teachers.teacher', 'firstName lastName');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Get attendance records for this student and course
    const attendanceRecords = await Attendance.find({
      studentId: student._id,
      classId
    }).sort({ date: -1 });

    // Get teacher name
    let teacherName = 'Not Assigned';
    if (course.teachers && course.teachers.length > 0) {
      const teacher = course.teachers[0].teacher;
      teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Not Assigned';
    }

    const total = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.status === 'late').length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

    // Group by month for chart
    const monthlyBreakdown = [];
    const recordsByMonth = new Map();

    attendanceRecords.forEach(record => {
      const monthKey = new Date(record.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!recordsByMonth.has(monthKey)) {
        recordsByMonth.set(monthKey, { present: 0, late: 0, absent: 0, total: 0 });
      }
      const monthData = recordsByMonth.get(monthKey);
      monthData.total++;
      if (record.status === 'present') monthData.present++;
      else if (record.status === 'late') monthData.late++;
      else if (record.status === 'absent') monthData.absent++;
    });

    for (const [month, data] of recordsByMonth) {
      monthlyBreakdown.push({
        month,
        present: data.present,
        late: data.late,
        absent: data.absent,
        total: data.total,
        percentage: ((data.present + data.late) / data.total * 100).toFixed(1)
      });
    }

    res.status(200).json({
      success: true,
      data: {
        course: {
          id: course._id,
          code: course.classCode,
          name: course.className,
          subject: course.subject,
          section: course.section,
          semester: course.semester,
          department: course.department,
          creditHours: course.creditHours,
          teacher: teacherName,
          schedule: course.schedule
        },
        stats: {
          total,
          present,
          late,
          absent,
          percentage
        },
        attendanceRecords: attendanceRecords.map(r => ({
          date: r.date,
          status: r.status,
          remarks: r.remarks,
          markedAt: r.markedAt
        })),
        monthlyBreakdown
      }
    });

  } catch (error) {
    console.error('Error fetching course attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== EXPORT STUDENT ATTENDANCE REPORT ====================
export const exportStudentAttendance = async (req, res) => {
  try {
    const student = req.student;

    const enrolledClasses = await Class.find({
      'students.student': student._id,
      'students.status': 'enrolled',
      isActive: true
    });

    const classIds = enrolledClasses.map(c => c._id);
    const attendanceRecords = await Attendance.find({
      studentId: student._id,
      classId: { $in: classIds }
    }).sort({ date: -1 }).populate('classId', 'classCode className subject');

    // Prepare CSV data
    const headers = ['Date', 'Course Code', 'Course Name', 'Subject', 'Status', 'Remarks'];
    const rows = attendanceRecords.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.classId?.classCode || 'N/A',
      record.classId?.className || 'N/A',
      record.classId?.subject || 'N/A',
      record.status.toUpperCase(),
      record.remarks || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_${student.rollNo || 'student'}.csv`);
    res.send(csvContent);

  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};