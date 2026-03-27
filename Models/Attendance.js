// models/Attendance.js

import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  // Which class (course)
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  
  // Which faculty marked attendance
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  
  // Which student
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  
  // Date of the class
  date: {
    type: Date,
    required: true
  },
  
  // Which schedule slot (if multiple classes same day)
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
    // This can reference the schedule subdocument from Class model
  },
  
  // Attendance status
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'absent'
  },
  
  // Optional remarks
  remarks: {
    type: String,
    default: ''
  },
  
  // When was attendance marked
  markedAt: {
    type: Date,
    default: Date.now
  },
  
  // Who marked (can be faculty or admin)
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Indexes for faster queries
attendanceSchema.index({ classId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, classId: 1 });
attendanceSchema.index({ facultyId: 1, date: 1 });
attendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);