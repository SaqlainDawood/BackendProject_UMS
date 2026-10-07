import mongoose from 'mongoose';

const academicNumberAuditSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: ['ASSIGN', 'UPDATE', 'CLEAR'],
      required: true,
      index: true,
    },
    oldRegistrationNumber: { type: String, default: null, trim: true },
    newRegistrationNumber: { type: String, default: null, trim: true },
    oldRollNumber: { type: String, default: null, trim: true },
    newRollNumber: { type: String, default: null, trim: true },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

academicNumberAuditSchema.index({ student: 1, createdAt: -1 });

const AcademicNumberAudit =
  mongoose.models.AcademicNumberAudit ||
  mongoose.model('AcademicNumberAudit', academicNumberAuditSchema);

export default AcademicNumberAudit;
