import mongoose from 'mongoose';
import Attendance from '../../Models/Attendance.js';
import Class from '../../Models/CreateClass.js';
import Student from '../../Models/StudentModel.js'
import Faculty from '../../Models/TeacherModel.js';

// ==================== GET STUDENTS FOR A CLASS ====================
export const getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // Optional: get attendance for specific date

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class ID' });
    }

    // Get class details
    const classData = await Class.findById(classId)
      .populate('students.student', 'firstName lastName rollNo profileImage')
      .populate('teachers.teacher', 'firstName lastName');

    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Get enrolled students
    const enrolledStudents = classData.students.filter(s => s.status === 'enrolled');
    const students = enrolledStudents.map(s => s.student);

    // If date provided, get existing attendance for that date
    let existingAttendance = [];
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      existingAttendance = await Attendance.find({
        classId,
        date: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });
    }

    // Prepare student list with attendance status
    const studentList = students.map(student => {
      const attendance = existingAttendance.find(
        a => a.studentId.toString() === student._id.toString()
      );
      
      return {
        studentId: student._id,
        rollNo: student.rollNo || 'N/A',
        name: `${student.firstName} ${student.lastName}`,
        profileImage: student.profileImage?.url,
        status: attendance?.status || 'unmarked',
        remarks: attendance?.remarks || '',
        attendanceId: attendance?._id
      };
    });

    res.status(200).json({
      success: true,
      data: {
        classId: classData._id,
        className: classData.className,
        classCode: classData.classCode,
        subject: classData.subject,
        section: classData.section,
        semester: classData.semester,
        department: classData.department,
        schedule: classData.schedule,
        totalStudents: students.length,
        students: studentList
      }
    });

  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== MARK ATTENDANCE ====================
export const markAttendance = async (req, res) => {
  try {
    const { classId, date, attendanceData, facultyId, remarks } = req.body;

    if (!classId || !date || !attendanceData || !facultyId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Validate class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    // Validate faculty is assigned to this class
    const isAssigned = classData.teachers.some(t => t.teacher.toString() === facultyId);
    if (!isAssigned) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this class' });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Process each student's attendance
    const results = [];
    for (const item of attendanceData) {
      const { studentId, status, studentRemarks } = item;

      // Check if attendance already exists for this student on this date
      const existingAttendance = await Attendance.findOne({
        classId,
        studentId,
        date: {
          $gte: targetDate,
          $lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      });

      if (existingAttendance) {
        // Update existing attendance
        existingAttendance.status = status;
        existingAttendance.remarks = studentRemarks || remarks;
        existingAttendance.modifiedAt = new Date();
        existingAttendance.modifiedBy = facultyId;
        existingAttendance.isModified = true;
        await existingAttendance.save();
        results.push({ studentId, status, action: 'updated' });
      } else {
        // Create new attendance record
        const newAttendance = new Attendance({
          classId,
          facultyId,
          studentId,
          date: targetDate,
          status,
          remarks: studentRemarks || remarks,
          markedBy: facultyId,
          markedAt: new Date()
        });
        await newAttendance.save();
        results.push({ studentId, status, action: 'created' });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Attendance saved successfully',
      data: { results, date: targetDate }
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET CLASS ATTENDANCE HISTORY ====================
export const getClassAttendanceHistory = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ success: false, message: 'Invalid class ID' });
    }

    // Get all attendance records for this class
    const attendanceRecords = await Attendance.find({ classId })
      .populate('studentId', 'firstName lastName rollNo')
      .sort({ date: -1 });

    // Group by date
    const attendanceByDate = {};
    attendanceRecords.forEach(record => {
      const dateKey = record.date.toISOString().split('T')[0];
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = {
          date: dateKey,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          totalStudents: 0,
          records: []
        };
      }
      
      attendanceByDate[dateKey].records.push(record);
      attendanceByDate[dateKey].totalStudents++;
      
      if (record.status === 'present') attendanceByDate[dateKey].totalPresent++;
      else if (record.status === 'absent') attendanceByDate[dateKey].totalAbsent++;
      else if (record.status === 'late') attendanceByDate[dateKey].totalLate++;
    });

    // Calculate percentages
    const history = Object.values(attendanceByDate).map(day => ({
      ...day,
      attendanceRate: ((day.totalPresent + day.totalLate) / day.totalStudents * 100).toFixed(1)
    }));

    res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET STUDENT ATTENDANCE ====================
export const getStudentAttendance = async (req, res) => {
  try {
    const { studentId, classId } = req.params;

    const attendanceRecords = await Attendance.find({
      studentId,
      classId
    }).sort({ date: -1 });

    const totalClasses = attendanceRecords.length;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'absent').length;
    const percentage = totalClasses > 0 ? ((presentCount + lateCount) / totalClasses * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalClasses,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        percentage,
        records: attendanceRecords
      }
    });

  } catch (error) {
    console.error('Error fetching student attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== EDIT ATTENDANCE ====================
export const editAttendance = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { status, remarks, facultyId } = req.body;

    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    attendance.status = status;
    attendance.remarks = remarks;
    attendance.modifiedAt = new Date();
    attendance.modifiedBy = facultyId;
    attendance.isModified = true;
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Attendance updated successfully',
      data: attendance
    });

  } catch (error) {
    console.error('Error editing attendance:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== GET ATTENDANCE REPORT ====================
export const getAttendanceReport = async (req, res) => {
  try {
    const { classId } = req.params;

    const classData = await Class.findById(classId)
      .populate('students.student', 'firstName lastName rollNo');

    const enrolledStudents = classData.students.filter(s => s.status === 'enrolled');
    const students = enrolledStudents.map(s => s.student);

    // Get all attendance records for this class
    const attendanceRecords = await Attendance.find({ classId });

    // Calculate per-student attendance
    const studentAttendance = students.map(student => {
      const studentRecords = attendanceRecords.filter(
        r => r.studentId.toString() === student._id.toString()
      );
      const total = studentRecords.length;
      const present = studentRecords.filter(r => r.status === 'present').length;
      const late = studentRecords.filter(r => r.status === 'late').length;
      const absent = studentRecords.filter(r => r.status === 'absent').length;
      const percentage = total > 0 ? ((present + late) / total * 100).toFixed(1) : 0;

      return {
        studentId: student._id,
        rollNo: student.rollNo,
        name: `${student.firstName} ${student.lastName}`,
        total,
        present,
        late,
        absent,
        percentage
      };
    });

    // Sort by percentage (lowest first)
    studentAttendance.sort((a, b) => a.percentage - b.percentage);

    res.status(200).json({
      success: true,
      data: {
        classInfo: {
          name: classData.className,
          code: classData.classCode,
          subject: classData.subject,
          department: classData.department,
          semester: classData.semester,
          section: classData.section
        },
        totalClasses: attendanceRecords.length / students.length || 0,
        students: studentAttendance
      }
    });

  } catch (error) {
    console.error('Error generating attendance report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};