import Activity from '../../Models/Activity.js';
import Submission from '../../Models/Submission.js';
import Class from '../../Models/CreateClass.js';
import Student from '../../Models/StudentModel.js';
import mongoose from 'mongoose';

// ==================== GET ALL ACTIVITIES FOR STUDENT ====================
export const getStudentActivities = async (req, res) => {
  try {
    const student = req.student;
    
    // Get all classes student is enrolled in
    const enrolledClasses = await Class.find({
      'students.student': student._id,
      'students.status': 'enrolled',
      isActive: true
    }).select('_id className classCode');
    
    const classIds = enrolledClasses.map(c => c._id);
    
    // Get all published activities for these classes
    const activities = await Activity.find({
      classId: { $in: classIds },
      isPublished: true,
      isArchived: false
    })
    .populate('classId', 'className classCode subject')
    .populate('facultyId', 'firstName lastName')
    .sort({ dueDate: 1, createdAt: -1 });
    
    // Get student's submissions for these activities
    const submissions = await Submission.find({
      studentId: student._id,
      activityId: { $in: activities.map(a => a._id) }
    });
    
    // Create a map of submissions by activityId
    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.activityId.toString()] = sub;
    });
    
    // Enrich activities with submission status
    const enrichedActivities = activities.map(activity => {
      const submission = submissionMap[activity._id.toString()];
      const activityObj = activity.toObject();
      
      // Check if due date passed
      const now = new Date();
      const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
      const isOverdue = dueDate && now > dueDate && !submission;
      const isLate = submission?.isLate || false;
      
      return {
        ...activityObj,
        submissionStatus: submission ? submission.status : 'not_submitted',
        submission: submission ? {
          _id: submission._id,
          submittedAt: submission.submittedAt,
          obtainedMarks: submission.obtainedMarks,
          status: submission.status,
          isLate: submission.isLate,
          attemptNumber: submission.attemptNumber
        } : null,
        isOverdue,
        isLate,
        canSubmit: activityObj.type !== 'presentation' && 
                   !submission && 
                   (!dueDate || now <= dueDate || activity.allowLateSubmission),
        timeRemaining: dueDate && now < dueDate ? 
                       Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null
      };
    });
    
    // Group by class
    const activitiesByClass = {};
    enrichedActivities.forEach(activity => {
      const classId = activity.classId._id.toString();
      if (!activitiesByClass[classId]) {
        activitiesByClass[classId] = {
          classInfo: activity.classId,
          activities: []
        };
      }
      activitiesByClass[classId].activities.push(activity);
    });
    
    // Calculate summary stats
    const summary = {
      totalActivities: activities.length,
      pendingSubmissions: enrichedActivities.filter(a => 
        a.type !== 'presentation' && !a.submission && !a.isOverdue
      ).length,
      overdueSubmissions: enrichedActivities.filter(a => 
        a.type !== 'presentation' && !a.submission && a.isOverdue
      ).length,
      completedActivities: enrichedActivities.filter(a => 
        a.type !== 'presentation' && a.submission
      ).length,
      gradedActivities: enrichedActivities.filter(a => 
        a.submission?.status === 'graded'
      ).length,
      upcomingDeadlines: enrichedActivities.filter(a => 
        a.dueDate && new Date(a.dueDate) > new Date() && !a.submission
      ).length
    };
    
    res.status(200).json({
      success: true,
      data: {
        summary,
        classes: Object.values(activitiesByClass),
        recentActivities: enrichedActivities.slice(0, 5)
      }
    });
    
  } catch (error) {
    console.error('Error fetching student activities:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET SINGLE ACTIVITY DETAILS ====================
export const getActivityDetails = async (req, res) => {
  try {
    const { activityId } = req.params;
    const student = req.student;
    
    const activity = await Activity.findById(activityId)
      .populate('classId', 'className classCode subject')
      .populate('facultyId', 'firstName lastName');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Check if student is enrolled in this class
    const classData = await Class.findOne({
      _id: activity.classId,
      'students.student': student._id,
      'students.status': 'enrolled'
    });
    
    if (!classData) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }
    
    // Get existing submission
    const submission = await Submission.findOne({
      activityId,
      studentId: student._id
    });
    
    // For quiz, don't send correct answers
    let activityData = activity.toObject();
    if (activity.type === 'quiz') {
      if (activityData.quizDetails?.questions) {
        activityData.quizDetails.questions = activityData.quizDetails.questions.map(q => ({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points
          // correctAnswer removed
        }));
      }
    }
    
    // Check submission eligibility
    const now = new Date();
    const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
    const canSubmit = activity.type !== 'presentation' && 
                      !submission && 
                      (!dueDate || now <= dueDate || activity.allowLateSubmission);
    
    // For quiz, check attempt limit
    let attemptsRemaining = null;
    if (activity.type === 'quiz' && activity.quizDetails?.attemptsAllowed) {
      const existingAttempts = await Submission.countDocuments({
        activityId,
        studentId: student._id
      });
      attemptsRemaining = activity.quizDetails.attemptsAllowed - existingAttempts;
    }
    
    res.status(200).json({
      success: true,
      data: {
        activity: activityData,
        submission: submission || null,
        canSubmit,
        attemptsRemaining,
        timeInfo: {
          currentTime: now,
          dueDate,
          isOverdue: dueDate && now > dueDate,
          timeRemaining: dueDate && now < dueDate ? 
                         Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching activity details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== SUBMIT ASSIGNMENT/EXAM ====================
export const submitAssignment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { activityId } = req.params;
    const student = req.student;
    
    const activity = await Activity.findById(activityId).session(session);
    
    if (!activity) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Activity not found'
      });
    }
    
    // Check if activity type is valid for file submission
    if (!['assignment', 'mid_exam', 'final_exam'].includes(activity.type)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot submit file for ${activity.type}`
      });
    }
    
    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      activityId,
      studentId: student._id
    }).session(session);
    
    if (existingSubmission) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this activity'
      });
    }
    
    // Check deadline
    const now = new Date();
    const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
    const isLate = dueDate && now > dueDate;
    
    if (isLate && !activity.allowLateSubmission) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Submission deadline has passed and late submissions are not allowed'
      });
    }
    
    // Check if file uploaded
    if (!req.file) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }
    
    // Calculate late days
    let lateDays = 0;
    if (isLate) {
      lateDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    }
    
    // Create submission
    const submission = new Submission({
      activityId,
      studentId: student._id,
      classId: activity.classId,
      activityType: activity.type,
      fileUrl: req.file.path || req.file.url,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      submittedAt: now,
      isLate,
      lateDays,
      totalMarks: activity.totalMarks,
      status: 'submitted'
    });
    
    await submission.save({ session });
    
    // Also add to Activity's submissions array
    activity.submissions.push({
      studentId: student._id,
      submittedAt: now,
      fileUrl: submission.fileUrl,
      fileName: submission.fileName,
      status: 'pending',
      submissionRef: submission._id
    });
    
    await activity.save({ session });
    
    await session.commitTransaction();
    
    res.status(201).json({
      success: true,
      message: isLate ? 'Assignment submitted late' : 'Assignment submitted successfully',
      data: {
        submissionId: submission._id,
        submittedAt: submission.submittedAt,
        isLate,
        lateDays: isLate ? lateDays : 0,
        fileName: submission.fileName
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error submitting assignment:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// ==================== SUBMIT QUIZ ====================
export const submitQuiz = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { activityId } = req.params;
    const { answers, timeTaken } = req.body;
    const student = req.student;
    
    const activity = await Activity.findById(activityId).session(session);
    
    if (!activity) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Quiz not found'
      });
    }
    
    if (activity.type !== 'quiz') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This activity is not a quiz'
      });
    }
    
    // Check attempt limit
    const existingAttempts = await Submission.countDocuments({
      activityId,
      studentId: student._id
    }).session(session);
    
    if (activity.quizDetails?.attemptsAllowed && 
        existingAttempts >= activity.quizDetails.attemptsAllowed) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached for this quiz'
      });
    }
    
    // Check deadline
    const now = new Date();
    const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
    const isLate = dueDate && now > dueDate;
    
    if (isLate && !activity.allowLateSubmission) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Quiz deadline has passed'
      });
    }
    
    // Auto-grade the quiz
    let obtainedMarks = 0;
    const questions = activity.quizDetails.questions;
    
    answers.forEach(answer => {
      const question = questions.id(answer.questionId);
      if (question && question.correctAnswer === answer.selectedOption) {
        obtainedMarks += question.points || 0;
      }
    });
    
    // Calculate late days
    let lateDays = 0;
    if (isLate) {
      lateDays = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
    }
    
    // Apply late penalty if applicable
    let finalMarks = obtainedMarks;
    if (isLate && activity.allowLateSubmission && activity.latePenalty) {
      const penaltyPercentage = Math.min(lateDays * activity.latePenalty, 100);
      finalMarks = obtainedMarks * (1 - penaltyPercentage / 100);
    }
    
    const percentage = (finalMarks / activity.totalMarks) * 100;
    
    // Create submission
    const submission = new Submission({
      activityId,
      studentId: student._id,
      classId: activity.classId,
      activityType: 'quiz',
      answers,
      submittedAt: now,
      isLate,
      lateDays,
      totalMarks: activity.totalMarks,
      obtainedMarks: Math.round(finalMarks * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      timeTaken,
      attemptNumber: existingAttempts + 1,
      isAutoGraded: true,
      status: 'graded'
    });
    
    await submission.save({ session });
    
    // Add to Activity's submissions
    activity.submissions.push({
      studentId: student._id,
      submittedAt: now,
      answers,
      obtainedMarks: submission.obtainedMarks,
      status: 'graded',
      isAutoGraded: true,
      submissionRef: submission._id
    });
    
    await activity.save({ session });
    
    await session.commitTransaction();
    
    // Show results based on settings
    const showResults = activity.quizDetails?.showResults || 'after_due_date';
    const shouldShowResults = showResults === 'immediately' || 
                             (showResults === 'after_due_date' && isLate);
    
    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        submissionId: submission._id,
        obtainedMarks: shouldShowResults ? submission.obtainedMarks : null,
        totalMarks: activity.totalMarks,
        percentage: shouldShowResults ? submission.percentage : null,
        attemptNumber: submission.attemptNumber,
        isLate,
        correctAnswers: shouldShowResults ? 
          answers.filter(a => {
            const q = questions.id(a.questionId);
            return q && q.correctAnswer === a.selectedOption;
          }).length : null,
        totalQuestions: questions.length
      }
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('Error submitting quiz:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

// ==================== GET STUDENT GRADES ====================
export const getStudentGrades = async (req, res) => {
  try {
    const student = req.student;
    
    // Get all submissions with grades
    const submissions = await Submission.find({
      studentId: student._id,
      status: { $in: ['graded', 'returned'] }
    })
    .populate({
      path: 'activityId',
      select: 'title type totalMarks dueDate weightage',
      populate: {
        path: 'classId',
        select: 'className classCode subject'
      }
    })
    .populate('gradedBy', 'firstName lastName')
    .sort({ gradedAt: -1, submittedAt: -1 });
    
    // Calculate overall statistics
    const stats = {
      totalActivities: submissions.length,
      totalMarksObtained: submissions.reduce((sum, s) => sum + (s.obtainedMarks || 0), 0),
      totalMarksPossible: submissions.reduce((sum, s) => sum + (s.totalMarks || 0), 0),
      averagePercentage: 0
    };
    
    if (stats.totalMarksPossible > 0) {
      stats.averagePercentage = (stats.totalMarksObtained / stats.totalMarksPossible * 100).toFixed(2);
    }
    
    // Group by class
    const gradesByClass = {};
    submissions.forEach(submission => {
      const activity = submission.activityId;
      if (!activity) return;
      
      const classId = activity.classId?._id?.toString();
      if (!classId) return;
      
      if (!gradesByClass[classId]) {
        gradesByClass[classId] = {
          classInfo: activity.classId,
          submissions: [],
          classStats: {
            totalObtained: 0,
            totalPossible: 0,
            count: 0
          }
        };
      }
      
      gradesByClass[classId].submissions.push({
        _id: submission._id,
        activityTitle: activity.title,
        activityType: activity.type,
        totalMarks: activity.totalMarks,
        obtainedMarks: submission.obtainedMarks,
        percentage: submission.percentage || 
                   ((submission.obtainedMarks / activity.totalMarks) * 100).toFixed(2),
        feedback: submission.feedback,
        submittedAt: submission.submittedAt,
        gradedAt: submission.gradedAt,
        gradedBy: submission.gradedBy ? 
                  `${submission.gradedBy.firstName} ${submission.gradedBy.lastName}` : null,
        isLate: submission.isLate,
        lateDays: submission.lateDays
      });
      
      gradesByClass[classId].classStats.totalObtained += submission.obtainedMarks || 0;
      gradesByClass[classId].classStats.totalPossible += activity.totalMarks || 0;
      gradesByClass[classId].classStats.count++;
    });
    
    // Calculate class-wise percentages
    Object.values(gradesByClass).forEach(classData => {
      const { totalObtained, totalPossible } = classData.classStats;
      classData.classStats.percentage = totalPossible > 0 ? 
        ((totalObtained / totalPossible) * 100).toFixed(2) : 0;
    });
    
    res.status(200).json({
      success: true,
      data: {
        overallStats: stats,
        classes: Object.values(gradesByClass),
        recentGrades: submissions.slice(0, 5).map(s => ({
          _id: s._id,
          activityTitle: s.activityId?.title,
          className: s.activityId?.classId?.className,
          obtainedMarks: s.obtainedMarks,
          totalMarks: s.totalMarks,
          percentage: s.percentage || ((s.obtainedMarks / s.totalMarks) * 100).toFixed(2),
          gradedAt: s.gradedAt
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ==================== GET UPCOMING DEADLINES ====================
export const getUpcomingDeadlines = async (req, res) => {
  try {
    const student = req.student;
    const { days = 7 } = req.query;
    
    const enrolledClasses = await Class.find({
      'students.student': student._id,
      'students.status': 'enrolled',
      isActive: true
    }).select('_id');
    
    const classIds = enrolledClasses.map(c => c._id);
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + parseInt(days));
    
    const activities = await Activity.find({
      classId: { $in: classIds },
      isPublished: true,
      isArchived: false,
      type: { $ne: 'presentation' },
      dueDate: {
        $gte: now,
        $lte: futureDate
      }
    })
    .populate('classId', 'className classCode subject')
    .sort({ dueDate: 1 });
    
    // Check which ones are already submitted
    const submissions = await Submission.find({
      studentId: student._id,
      activityId: { $in: activities.map(a => a._id) }
    });
    
    const submittedIds = new Set(submissions.map(s => s.activityId.toString()));
    
    const upcomingDeadlines = activities
      .filter(a => !submittedIds.has(a._id.toString()))
      .map(activity => {
        const dueDate = new Date(activity.dueDate);
        const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        const hoursRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60));
        
        return {
          _id: activity._id,
          title: activity.title,
          type: activity.type,
          classInfo: activity.classId,
          dueDate,
          daysRemaining,
          hoursRemaining,
          totalMarks: activity.totalMarks,
          urgency: daysRemaining <= 1 ? 'urgent' : 
                   daysRemaining <= 3 ? 'soon' : 'upcoming'
        };
      });
    
    res.status(200).json({
      success: true,
      data: {
        count: upcomingDeadlines.length,
        deadlines: upcomingDeadlines,
        summary: {
          urgent: upcomingDeadlines.filter(d => d.urgency === 'urgent').length,
          soon: upcomingDeadlines.filter(d => d.urgency === 'soon').length,
          upcoming: upcomingDeadlines.filter(d => d.urgency === 'upcoming').length
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching upcoming deadlines:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};