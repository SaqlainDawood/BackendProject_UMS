import Class from "../Models/CreateClass.js";
import Student from "../Models/StudentModel.js";
import mongoose from "mongoose";

/**
 * Convert time string (HH:MM) to minutes for comparison
 */
export const convertTimeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

/**
 * Check if a student has schedule conflict with new class timings
 * @param {string} studentId - Student's MongoDB ID
 * @param {Array} newSchedule - Schedule of new class [{day, startTime, endTime, room}]
 * @param {object} session - MongoDB session (optional)
 * @param {string} excludeClassId - Class ID to exclude (for updates)
 * @returns {Promise<Array>} - Array of conflicts
 */
export const checkStudentScheduleConflict = async (studentId, newSchedule, session = null, excludeClassId = null) => {
  try {
    // Build query to find all ACTIVE classes where this student is enrolled
    const query = {
      'students.student': new mongoose.Types.ObjectId(studentId),
      'students.status': 'enrolled',
      isActive: true
    };
    
    // Exclude current class when updating
    if (excludeClassId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeClassId) };
    }
    
    let enrolledClasses;
    if (session) {
      enrolledClasses = await Class.find(query).session(session);
    } else {
      enrolledClasses = await Class.find(query);
    }
    
    const conflicts = [];
    
    // Check each existing class against new schedule
    for (const existingClass of enrolledClasses) {
      for (const existingSchedule of existingClass.schedule) {
        for (const newSched of newSchedule) {
          // Same day check
          if (existingSchedule.day === newSched.day) {
            const existingStart = convertTimeToMinutes(existingSchedule.startTime);
            const existingEnd = convertTimeToMinutes(existingSchedule.endTime);
            const newStart = convertTimeToMinutes(newSched.startTime);
            const newEnd = convertTimeToMinutes(newSched.endTime);
            
            // Check if time overlaps
            if (newStart < existingEnd && newEnd > existingStart) {
              conflicts.push({
                hasConflict: true,
                existingClass: {
                  id: existingClass._id,
                  name: existingClass.className,
                  code: existingClass.classCode,
                  day: existingSchedule.day,
                  startTime: existingSchedule.startTime,
                  endTime: existingSchedule.endTime,
                  room: existingSchedule.room
                },
                newSchedule: newSched,
                message: `Student already has class "${existingClass.className}" on ${existingSchedule.day} from ${existingSchedule.startTime} to ${existingSchedule.endTime} in ${existingSchedule.room}`
              });
            }
          }
        }
      }
    }
    
    return conflicts;
    
  } catch (error) {
    console.error("Error checking student schedule conflict:", error);
    throw error;
  }
};

/**
 * Check multiple students for schedule conflicts
 * @param {Array} studentIds - Array of student IDs
 * @param {Array} newSchedule - New class schedule
 * @param {object} session - MongoDB session
 * @returns {Promise<Object>} - Object with valid and invalid students
 */
export const checkBulkStudentConflicts = async (studentIds, newSchedule, session = null) => {
  const results = {
    valid: [],
    invalid: [],
    conflictDetails: []
  };
  
  for (const studentId of studentIds) {
    const conflicts = await checkStudentScheduleConflict(studentId, newSchedule, session);
    
    if (conflicts.length === 0) {
      results.valid.push(studentId);
    } else {
      results.invalid.push(studentId);
      results.conflictDetails.push({
        studentId: studentId,
        conflicts: conflicts
      });
    }
  }
  
  return results;
};

/**
 * Validate if a student can enroll in a class (complete validation)
 * @param {string} studentId - Student ID
 * @param {string} classId - Class ID
 * @param {object} session - MongoDB session
 * @returns {Promise<Object>} - Validation result
 */
export const validateStudentEnrollment = async (studentId, classId, session = null) => {
  try {
    // 1. Check if student exists and is active
    let student;
    if (session) {
      student = await Student.findById(studentId).session(session);
    } else {
      student = await Student.findById(studentId);
    }
    
    if (!student) {
      return { valid: false, reason: "Student not found" };
    }
    
    // ✅ FIXED: Include all valid student statuses (case-insensitive)
    const validStatuses = ['active', 'approved', 'Active', 'assign', 'unassigned'];
    const isValidStatus = validStatuses.some(
      status => student.status?.toLowerCase() === status.toLowerCase()
    );
    
    if (!isValidStatus) {
      console.log(`Student ${student.firstName} ${student.lastName} has invalid status: ${student.status}`);
      return { valid: false, reason: `Student is not active (Status: ${student.status})` };
    }
    
    // 2. Check if class exists and is active
    let classData;
    if (session) {
      classData = await Class.findById(classId).session(session);
    } else {
      classData = await Class.findById(classId);
    }
    
    if (!classData) {
      return { valid: false, reason: "Class not found" };
    }
    
    if (!classData.isActive) {
      return { valid: false, reason: "Class is not active" };
    }
    
    // 3. Check if student is already enrolled
    const alreadyEnrolled = classData.students.some(
      s => s.student.toString() === studentId && s.status === 'enrolled'
    );
    
    if (alreadyEnrolled) {
      return { valid: false, reason: "Student is already enrolled in this class" };
    }
    
    // 4. Check capacity
    const enrolledCount = classData.students.filter(s => s.status === 'enrolled').length;
    if (enrolledCount >= classData.capacity) {
      return { valid: false, reason: `Class is full (Capacity: ${classData.capacity}/${enrolledCount})` };
    }
    
    // 5. Check schedule conflicts
    const conflicts = await checkStudentScheduleConflict(studentId, classData.schedule, session);
    
    if (conflicts.length > 0) {
      return { 
        valid: false, 
        reason: "Schedule conflict detected",
        conflicts: conflicts 
      };
    }
    
    // 6. Check credit hours limit (optional)
    let studentClasses;
    if (session) {
      studentClasses = await Class.find({
        'students.student': studentId,
        'students.status': 'enrolled',
        isActive: true,
        _id: { $ne: classId }
      }).session(session);
    } else {
      studentClasses = await Class.find({
        'students.student': studentId,
        'students.status': 'enrolled',
        isActive: true,
        _id: { $ne: classId }
      });
    }
    
    const totalCredits = studentClasses.reduce((sum, c) => sum + (c.creditHours || 0), 0);
    const newTotalCredits = totalCredits + (classData.creditHours || 0);
    const MAX_CREDITS = 21; // Maximum credits per semester
    
    if (newTotalCredits > MAX_CREDITS) {
      return { 
        valid: false, 
        reason: `Credit hours limit exceeded. Current: ${totalCredits}, Adding: ${classData.creditHours}, Max: ${MAX_CREDITS}` 
      };
    }
    
    return { 
      valid: true,
      student: student,
      classData: classData,
      currentCredits: totalCredits,
      newCredits: newTotalCredits
    };
    
  } catch (error) {
    console.error("Error validating enrollment:", error);
    return { valid: false, reason: error.message };
  }
};

/**
 * Get student's complete schedule
 * @param {string} studentId - Student ID
 * @returns {Promise<Object>} - Student schedule
 */
export const getStudentCompleteSchedule = async (studentId) => {
  try {
    const enrolledClasses = await Class.find({
      'students.student': studentId,
      'students.status': 'enrolled',
      isActive: true
    }).populate('teachers.teacher', 'firstName lastName designation');
    
    // Organize schedule by day
    const weeklySchedule = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: []
    };
    
    let totalCredits = 0;
    
    for (const cls of enrolledClasses) {
      totalCredits += cls.creditHours || 0;
      
      for (const schedule of cls.schedule) {
        if (weeklySchedule[schedule.day]) {
          weeklySchedule[schedule.day].push({
            classId: cls._id,
            className: cls.className,
            classCode: cls.classCode,
            subject: cls.subject,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            room: schedule.room,
            teacher: cls.teachers[0]?.teacher?.firstName + ' ' + cls.teachers[0]?.teacher?.lastName || 'Not Assigned'
          });
        }
      }
    }
    
    // Sort each day by start time
    for (const day in weeklySchedule) {
      weeklySchedule[day].sort((a, b) => {
        return convertTimeToMinutes(a.startTime) - convertTimeToMinutes(b.startTime);
      });
    }
    
    return {
      studentId,
      totalCredits,
      totalClasses: enrolledClasses.length,
      weeklySchedule,
      enrolledClasses
    };
    
  } catch (error) {
    console.error("Error getting student schedule:", error);
    throw error;
  }
};