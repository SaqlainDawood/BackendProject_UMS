import mongoose from 'mongoose';

const coordinatorSchema = new mongoose.Schema({
  // ========== REFERENCE TO USER MODEL ==========
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User account is required'],
    unique: true
  },

  // ========== PERSONAL INFORMATION ==========
  coordId: {
    type: String,
    required: [true, 'Coordinator ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+92[0-9]{10}$/, 'Please enter a valid Pakistani phone number (+92XXXXXXXXXX)']
  },
  cnic: {
    type: String,
    required: [true, 'CNIC is required'],
    unique: true,
    match: [/^[0-9]{5}-[0-9]{7}-[0-9]{1}$/, 'CNIC must be in format: 12345-1234567-1']
  },
  address: {
    type: String,
    trim: true
  },
  profileImage: {
    url: { type: String },
    public_id: { type: String }
  },
  DOB: {
    type: Date
  },

  // ========== ACADEMIC CREDENTIALS ==========
  highestQualification: {
    type: String,
    required: [true, 'Highest qualification is required'],
    enum: ['PhD', 'Masters', 'Bachelors']
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true
  },
  institution: {
    type: String,
    required: [true, 'University/Institution is required'],
    trim: true
  },
  graduationYear: {
    type: Number,
    required: [true, 'Graduation year is required'],
    min: [1980, 'Graduation year must be after 1980'],
    max: [new Date().getFullYear(), 'Graduation year cannot be in future']
  },
  degreeCertificate: {
    url: { type: String },
    public_id: { type: String }
  },

  // ========== PROFESSIONAL EXPERIENCE ==========
  yearsOfExperience: {
    type: Number,
    required: [true, 'Years of experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  previousPosition: {
    type: String,
    trim: true
  },
  previousInstitution: {
    type: String,
    trim: true
  },
  areaOfExpertise: {
    type: String,
    trim: true
  },
  employmentType: {
    type: String,
    required: [true, 'Employment type is required'],
    enum: ['Full-time', 'Part-time', 'Contract', 'Visiting']
  },
  salaryGrade: {
    type: String,
    required: [true, 'Salary grade is required'],
    enum: ['BPS-17', 'BPS-18', 'BPS-19', 'Contract-1']
  },
  basicSalary: {
    type: Number,
    required: [true, 'Basic salary is required'],
    min: [0, 'Salary cannot be negative']
  },
  contractExpiry: {
    type: Date
  },
  probationPeriod: {
    type: Number,
    min: 0,
    max: 12,
    default: 0
  },
  bankAccount: {
    type: String,
    trim: true
  },
  bankAccountTitle: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: [
      'Computer Science',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Software Engineering',
      'Business Administration'
    ]
  },

  coordinatorRole: {
    type: String,
    required: [true, 'Coordinator role is required'],
    enum: [
       'Department Coordinator',
      'Semester Coordinator',
      'Examination Coordinator',
      'Admissions Coordinator',
      'Program Coordinator',
      'Fee Coordinator'
    ]
  },
  roleTitle: {
    type: String,
    required: [true, 'Role title is required'],
    trim: true
  },

  // ========== PERMISSIONS & ACCESS ==========

  permissions: {
    students: {
      type: [String],
      enum: ['view', 'create', 'edit', 'delete', 'export'],
      default: []
    },
    faculty: {
      type: [String],
      enum: ['view', 'create', 'edit', 'assign_courses', 'evaluate'],
      default: []
    },
    courses: {
      type: [String],
      enum: ['view', 'create', 'edit', 'schedule', 'assign_faculty'],
      default: []
    },
    examinations: {
      type: [String],
      enum: ['view', 'create', 'edit', 'schedule', 'publish_results'],
      default: []
    },
    fees: {
      type: [String],
      enum: ['view', 'collect', 'waiver', 'generate_receipts', 'reports'],
      default: []
    },
    reports: {
      type: [String],
      enum: ['academic', 'financial', 'attendance', 'performance', 'custom'],
      default: []
    }
  },

  // ========== EMERGENCY CONTACT ==========
  emergencyContactName: {
    type: String,
    trim: true
  },
  emergencyContactPhone: {
    type: String,
    match: [/^\+92[0-9]{10}$/, 'Please enter a valid Pakistani phone number']
  },

  // ========== STATUS & ADMINISTRATION ==========
  status: {
    type: String,
    enum: ['active', 'on_leave', 'inactive'],
    default: 'active'
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true
    },

  // ========== SYSTEM FIELDS ==========
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true 
});

// ========== ESSENTIAL MIDDLEWARE ==========
// Filter out deleted coordinators from queries
coordinatorSchema.pre(/^find/, function(next) {
  // This applies to find, findOne, findById, etc.
  if (this.getFilter().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

// ========== ESSENTIAL INDEXES ==========
coordinatorSchema.index({ coordId: 1 }, { unique: true });
coordinatorSchema.index({ cnic: 1 }, { unique: true });
coordinatorSchema.index({ user: 1 }, { unique: true });
coordinatorSchema.index({ department: 1 });
coordinatorSchema.index({ status: 1 });

// ========== VIRTUAL FIELDS (Optional but useful) ==========
// These make accessing user properties easier
coordinatorSchema.virtual('email').get(function() {
  return this.user?.email;
});

coordinatorSchema.virtual('isActive').get(function() {
  return this.user?.isActive;
});

// ========== METHODS ==========
// Populate user data
coordinatorSchema.methods.populateUser = async function() {
  return await this.populate('user', 'email role isActive lastLogin');
};

// Soft delete coordinator
coordinatorSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  return await this.save();
};

const Coordinator = mongoose.model('Coordinator', coordinatorSchema);

export default Coordinator;

