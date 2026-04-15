import Activity from '../../Models/Activity.js';
import Class from '../../Models/CreateClass.js';
import Faculty from '../../Models/TeacherModel.js';

// @desc    Get marking list for an activity
// @route   GET /api/grading/activity/:activityId
// @access  Private (Faculty only)
export const getMarkingList = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const activity = await Activity.findById(activityId)
      .populate('classId', 'className classCode enrolledCount')
      .populate('submissions.studentId', 'firstName lastName rollNo registrationNo profileImage');
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    const classData = await Class.findById(activity.classId)
      .populate('students.student', 'firstName lastName rollNo registrationNo profileImage');
    
    const enrolledStudents = classData.students.filter(s => s.status === 'enrolled');
    
    const markingList = enrolledStudents.map(enrollment => {
      const student = enrollment.student;
      const submission = activity.submissions?.find(
        sub => sub.studentId?._id.toString() === student._id.toString()
      );
      
      let isLate = false, lateDays = 0;
      if (submission && activity.dueDate) {
        const submittedAt = new Date(submission.submittedAt);
        const dueDate = new Date(activity.dueDate);
        if (submittedAt > dueDate) {
          isLate = true;
          lateDays = Math.ceil((submittedAt - dueDate) / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        student: {
          _id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          rollNo: student.rollNo,
          registrationNo: student.registrationNo
        },
        submission: submission ? {
          _id: submission._id,
          submittedAt: submission.submittedAt,
          fileUrl: submission.fileUrl,
          fileName: submission.fileName,
          obtainedMarks: submission.obtainedMarks,
          feedback: submission.feedback,
          status: submission.status
        } : null,
        submissionStatus: submission ? 'submitted' : 'not_submitted',
        isLate,
        lateDays,
        penalty: activity.allowLateSubmission && isLate ? 
          Math.min(lateDays * activity.latePenalty, 100) : 0
      };
    });
    
    res.json({
      success: true,
      data: {
        activity: {
          _id: activity._id,
          title: activity.title,
          type: activity.type,
          totalMarks: activity.totalMarks,
          dueDate: activity.dueDate,
          rubric: activity.rubric
        },
        class: {
          _id: classData._id,
          name: classData.className,
          code: classData.classCode
        },
        markingList,
        summary: {
          total: markingList.length,
          submitted: markingList.filter(m => m.submissionStatus === 'submitted').length,
          notSubmitted: markingList.filter(m => m.submissionStatus === 'not_submitted').length,
          graded: markingList.filter(m => m.submission?.status === 'graded').length,
          pending: markingList.filter(m => m.submission?.status === 'pending').length
        }
      }
    });
    
  } catch (error) {
    console.error('Get marking list error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Grade a single submission
// @route   PUT /api/grading/activity/:activityId/submission/:submissionId
// @access  Private (Faculty only)
export const gradeSubmission = async (req, res) => {
  try {
    const { activityId, submissionId } = req.params;
    const { obtainedMarks, feedback } = req.body;
    
    const activity = await Activity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    const submission = activity.submissions.id(submissionId);
    
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    if (obtainedMarks < 0 || obtainedMarks > activity.totalMarks) {
      return res.status(400).json({ 
        success: false, 
        message: `Marks must be between 0 and ${activity.totalMarks}` 
      });
    }
    
    let finalMarks = obtainedMarks;
    
    if (activity.allowLateSubmission && activity.dueDate) {
      const submittedAt = new Date(submission.submittedAt);
      const dueDate = new Date(activity.dueDate);
      if (submittedAt > dueDate) {
        const lateDays = Math.ceil((submittedAt - dueDate) / (1000 * 60 * 60 * 24));
        const penaltyPercentage = Math.min(lateDays * activity.latePenalty, 100);
        finalMarks = obtainedMarks * (1 - penaltyPercentage / 100);
      }
    }
    
    submission.obtainedMarks = Math.round(finalMarks * 100) / 100;
    submission.feedback = feedback || '';
    submission.status = 'graded';
    submission.gradedBy = req.faculty._id;
    submission.gradedAt = new Date();
    
    await activity.save();
    
    res.json({
      success: true,
      data: {
        obtainedMarks: submission.obtainedMarks,
        feedback: submission.feedback,
        status: submission.status
      },
      message: 'Submission graded successfully'
    });
    
  } catch (error) {
    console.error('Grade submission error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Bulk grade submissions
// @route   PUT /api/grading/activity/:activityId/bulk-grade
// @access  Private (Faculty only)
export const bulkGradeSubmissions = async (req, res) => {
  try {
    const { activityId } = req.params;
    const { grades } = req.body;
    
    const activity = await Activity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    const results = [];
    
    for (const grade of grades) {
      const submission = activity.submissions.id(grade.submissionId);
      if (submission) {
        let finalMarks = grade.obtainedMarks;
        
        if (activity.allowLateSubmission && activity.dueDate) {
          const submittedAt = new Date(submission.submittedAt);
          const dueDate = new Date(activity.dueDate);
          if (submittedAt > dueDate) {
            const lateDays = Math.ceil((submittedAt - dueDate) / (1000 * 60 * 60 * 24));
            const penaltyPercentage = Math.min(lateDays * activity.latePenalty, 100);
            finalMarks = grade.obtainedMarks * (1 - penaltyPercentage / 100);
          }
        }
        
        submission.obtainedMarks = Math.round(finalMarks * 100) / 100;
        submission.feedback = grade.feedback || '';
        submission.status = 'graded';
        submission.gradedBy = req.faculty._id;
        submission.gradedAt = new Date();
        
        results.push({ submissionId: submission._id, status: 'graded' });
      }
    }
    
    await activity.save();
    
    res.json({
      success: true,
      data: { graded: results.length },
      message: `${results.length} submissions graded successfully`
    });
    
  } catch (error) {
    console.error('Bulk grade error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Auto-grade quiz
// @route   POST /api/grading/activity/:activityId/auto-grade
// @access  Private (Faculty only)
export const autoGradeQuiz = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const activity = await Activity.findById(activityId);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    if (activity.type !== 'quiz') {
      return res.status(400).json({ 
        success: false, 
        message: 'Auto-grading is only available for quizzes' 
      });
    }
    
    let gradedCount = 0;
    
    for (const submission of activity.submissions) {
      if (submission.status === 'pending' && submission.answers?.length > 0) {
        activity.autoGradeQuiz(submission._id);
        gradedCount++;
      }
    }
    
    await activity.save();
    
    res.json({
      success: true,
      data: { gradedCount },
      message: `${gradedCount} submissions auto-graded successfully`
    });
    
  } catch (error) {
    console.error('Auto-grade error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Export grades to CSV
// @route   GET /api/grading/activity/:activityId/export
// @access  Private (Faculty only)
export const exportGrades = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const activity = await Activity.findById(activityId)
      .populate('classId', 'className classCode')
      .populate('submissions.studentId', 'firstName lastName rollNo registrationNo');
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    const classData = await Class.findById(activity.classId)
      .populate('students.student', 'firstName lastName rollNo registrationNo');
    
    const enrolledStudents = classData.students.filter(s => s.status === 'enrolled');
    
    const exportData = enrolledStudents.map(enrollment => {
      const student = enrollment.student;
      const submission = activity.submissions?.find(
        sub => sub.studentId?._id.toString() === student._id.toString()
      );
      
      return {
        'Roll No': student.rollNo || '-',
        'Registration No': student.registrationNo || '-',
        'Student Name': `${student.firstName} ${student.lastName}`,
        'Status': submission ? submission.status : 'Not Submitted',
        'Obtained Marks': submission?.obtainedMarks ?? '-',
        'Total Marks': activity.totalMarks,
        'Percentage': submission?.obtainedMarks ? 
          ((submission.obtainedMarks / activity.totalMarks) * 100).toFixed(2) + '%' : '-',
        'Feedback': submission?.feedback || '-'
      };
    });
    
    const { format = 'json' } = req.query;
    
    if (format === 'csv') {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [headers.join(',')];
      
      for (const row of exportData) {
        const values = headers.map(h => {
          const val = row[h];
          return typeof val === 'string' && (val.includes(',') || val.includes('"')) 
            ? `"${val.replace(/"/g, '""')}"` : val;
        });
        csvRows.push(values.join(','));
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=grades_${activity.title.replace(/\s/g, '_')}.csv`);
      return res.send(csvRows.join('\n'));
    }
    
    res.json({ success: true, data: exportData });
    
  } catch (error) {
    console.error('Export grades error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};