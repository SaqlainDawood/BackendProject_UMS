import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  // References
  activityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Activity',
    required: [true, 'Activity ID is required']
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: [true, 'Student ID is required']
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: [true, 'Class ID is required']
  },
  
  // Submission Type (from activity)
  activityType: {
    type: String,
    enum: ['assignment', 'quiz', 'mid_exam', 'final_exam'],
    required: true
  },
  
  // File Submission (for assignments/exams)
  fileUrl: {
    type: String
  },
  fileName: {
    type: String
  },
  fileSize: {
    type: Number
  },
  
  // Quiz Submission
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    selectedOption: {
      type: Number,
      required: true
    }
  }],
  
  // Text Submission (optional)
  textContent: {
    type: String
  },
  
  // Submission Metadata
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateDays: {
    type: Number,
    default: 0
  },
  
  // Grading
  obtainedMarks: {
    type: Number,
    min: 0
  },
  totalMarks: {
    type: Number
  },
  percentage: {
    type: Number
  },
  feedback: {
    type: String,
    default: ''
  },
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned'],
    default: 'submitted'
  },
  
  // Auto-grading
  isAutoGraded: {
    type: Boolean,
    default: false
  },
  
  // Grading Metadata
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty'
  },
  gradedAt: {
    type: Date
  },
  
  // Attempt Number (for multiple quiz attempts)
  attemptNumber: {
    type: Number,
    default: 1
  },
  
  // Time taken (for quiz)
  timeTaken: {
    type: Number // in seconds
  },
  
  // Plagiarism Check
  plagiarismScore: {
    type: Number,
    min: 0,
    max: 100
  },
  plagiarismReport: {
    type: String
  }

}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
submissionSchema.index({ activityId: 1, studentId: 1 }, { unique: true });
submissionSchema.index({ studentId: 1, status: 1 });
submissionSchema.index({ classId: 1, createdAt: -1 });
submissionSchema.index({ activityId: 1, status: 1 });
submissionSchema.index({ gradedBy: 1 });
submissionSchema.index({ submittedAt: -1 });

// Virtual for submission age
submissionSchema.virtual('submissionAge').get(function() {
  return Math.floor((Date.now() - this.submittedAt) / (1000 * 60 * 60 * 24));
});

// Method to check if submission is late
submissionSchema.methods.checkIfLate = function(dueDate) {
  if (!dueDate) return false;
  const submitted = new Date(this.submittedAt);
  const due = new Date(dueDate);
  this.isLate = submitted > due;
  if (this.isLate) {
    this.lateDays = Math.ceil((submitted - due) / (1000 * 60 * 60 * 24));
  }
  return this.isLate;
};

// Method to calculate penalty
submissionSchema.methods.calculatePenalty = function(latePenaltyPercentage) {
  if (!this.isLate || !latePenaltyPercentage) return 0;
  const penalty = Math.min(this.lateDays * latePenaltyPercentage, 100);
  return (this.obtainedMarks * penalty) / 100;
};

// Method to get final marks after penalty
submissionSchema.methods.getFinalMarks = function(latePenaltyPercentage) {
  if (!this.obtainedMarks) return 0;
  const penalty = this.calculatePenalty(latePenaltyPercentage);
  return Math.max(0, this.obtainedMarks - penalty);
};

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;