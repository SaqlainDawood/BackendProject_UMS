import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true, min: 0 },
    points: { type: Number, default: 1, min: 1 },
  },
  { _id: true },
);

const submissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    submittedAt: { type: Date, default: Date.now },
    fileUrl: { type: String },
    fileName: { type: String },
    answers: [
      { questionId: mongoose.Schema.Types.ObjectId, selectedOption: Number },
    ],
    obtainedMarks: { type: Number, min: 0 },
    feedback: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "graded", "returned"],
      default: "pending",
    },
    isAutoGraded: { type: Boolean, default: false },
    gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
    gradedAt: { type: Date },
  },
  { _id: true, timestamps: true },
);

const activitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    instructions: { type: String, default: "" },

    type: {
      type: String,
      enum: ["assignment", "quiz", "presentation", "mid_exam", "final_exam"],
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    publishDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    startTime: { type: Date },
    endTime: { type: Date },
    allowLateSubmission: { type: Boolean, default: false },
    latePenalty: { type: Number, default: 10, min: 0, max: 100 },

    totalMarks: { type: Number, min: 1, default: 100 },
    passingMarks: { type: Number, min: 0 },
    weightage: { type: Number, min: 0, max: 100 },

    attachments: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileType: { type: String },
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    quizDetails: {
      timeLimit: { type: Number, min: 1 },
      shuffleQuestions: { type: Boolean, default: false },
      shuffleOptions: { type: Boolean, default: false },
      showResults: {
        type: String,
        enum: ["immediately", "after_due_date", "never"],
        default: "after_due_date",
      },
      attemptsAllowed: { type: Number, default: 1, min: 1 },
      questions: [questionSchema],
    },

    examDetails: {
      room: { type: String },
      seatingPlan: { type: String },
      invigilator: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
      syllabus: { type: String },
    },

    submissions: [submissionSchema],

    rubric: [
      {
        criteria: { type: String, required: true },
        maxPoints: { type: Number, required: true, min: 1 },
        description: String,
      },
    ],

    isPublished: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    visibleToStudents: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
    ],

    plagiarismCheck: {
      enabled: { type: Boolean, default: false },
      threshold: { type: Number, min: 0, max: 100, default: 30 },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtuals
activitySchema.virtual("submissionCount").get(function () {
  return this.submissions?.length || 0;
});

activitySchema.virtual("gradedCount").get(function () {
  return this.submissions?.filter((s) => s.status === "graded").length || 0;
});

activitySchema.virtual("pendingGradingCount").get(function () {
  return this.submissions?.filter((s) => s.status === "pending").length || 0;
});

activitySchema.virtual("averageScore").get(function () {
  if (!this.submissions?.length) return 0;
  const graded = this.submissions.filter(
    (s) => s.obtainedMarks !== undefined && s.obtainedMarks !== null,
  );
  if (!graded.length) return 0;
  const sum = graded.reduce((acc, s) => acc + s.obtainedMarks, 0);
  return (sum / graded.length).toFixed(2);
});

// Methods
activitySchema.methods.canStudentSubmit = function (studentId) {
  if (!this.isPublished)
    return { can: false, reason: "Activity not published" };
  if (this.dueDate && new Date() > this.dueDate && !this.allowLateSubmission) {
    return { can: false, reason: "Submission deadline passed" };
  }
  if (this.type === "quiz" && this.quizDetails?.attemptsAllowed) {
    const attempts =
      this.submissions?.filter(
        (s) => s.studentId.toString() === studentId.toString(),
      ).length || 0;
    if (attempts >= this.quizDetails.attemptsAllowed) {
      return { can: false, reason: "Maximum attempts reached" };
    }
  }
  return { can: true };
};

activitySchema.methods.autoGradeQuiz = function (submissionId) {
  const submission = this.submissions.id(submissionId);
  if (!submission || this.type !== "quiz") return 0;

  let totalObtained = 0;
  submission.answers.forEach((answer) => {
    const question = this.quizDetails.questions.id(answer.questionId);
    if (question && question.correctAnswer === answer.selectedOption) {
      totalObtained += question.points;
    }
  });

  submission.obtainedMarks = totalObtained;
  submission.status = "graded";
  submission.isAutoGraded = true;
  return totalObtained;
};

activitySchema.methods.getStudentSubmission = function (studentId) {
  return this.submissions?.find(
    (s) => s.studentId.toString() === studentId.toString(),
  );
};

// Indexes
activitySchema.index({ classId: 1, type: 1 });
activitySchema.index({ facultyId: 1, createdAt: -1 });
activitySchema.index({ classId: 1, isPublished: 1 });
activitySchema.index({ dueDate: 1 });
activitySchema.index({ "submissions.studentId": 1 });

export default mongoose.model("Activity", activitySchema);
