import Activity from '../../Models/Activity.js';
import Class from '../../Models/CreateClass.js';
import Faculty from '../../Models/TeacherModel.js';
import mongoose from 'mongoose';

// @desc    Create a new activity
// @route   POST /api/activities
// @access  Private (Faculty only)
export const createActivity = async (req, res) => {
  try {
    const faculty = req.faculty; // From facultyAuth middleware
    
    if (!faculty) {
      return res.status(404).json({ 
        success: false, 
        message: 'Faculty profile not found' 
      });
    }
    
    // Verify faculty teaches this class
    const classData = await Class.findOne({
      _id: req.body.classId,
      'teachers.teacher': faculty._id
    });
    
    if (!classData) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to teach this class' 
      });
    }
    
    const activityData = {
      ...req.body,
      facultyId: faculty._id,
      createdBy: req.user._id
    };
    
    const activity = await Activity.create(activityData);
    
    res.status(201).json({
      success: true,
      data: activity,
      message: `${activity.type} created successfully`
    });
    
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get all activities for a class
// @route   GET /api/activities/class/:classId
// @access  Private (Faculty only)
export const getClassActivities = async (req, res) => {
  try {
    const { classId } = req.params;
    const { type, isPublished } = req.query;
    
    const query = { classId };
    if (type) query.type = type;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';
    
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .populate('facultyId', 'firstName lastName employeeID')
      .select('-submissions');
    
    const stats = await Activity.aggregate([
      { $match: { classId: new mongoose.Types.ObjectId(classId) } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    res.json({
      success: true,
      count: activities.length,
      stats,
      data: activities
    });
    
  } catch (error) {
    console.error('Get class activities error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get single activity details
// @route   GET /api/activities/:id
// @access  Private (Faculty only)
export const getActivityById = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('classId', 'className classCode semester section')
      .populate('facultyId', 'firstName lastName employeeID')
      .populate('submissions.studentId', 'firstName lastName rollNo registrationNo');
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    res.json({
      success: true,
      data: activity
    });
    
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Update activity
// @route   PUT /api/activities/:id
// @access  Private (Faculty only)
export const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    // Check if faculty owns this activity
    if (activity.facultyId.toString() !== req.faculty._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only update your own activities' 
      });
    }
    
    delete req.body.type; // Don't allow type change
    
    const updatedActivity = await Activity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.json({
      success: true,
      data: updatedActivity,
      message: 'Activity updated successfully'
    });
    
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Delete activity (archive)
// @route   DELETE /api/activities/:id
// @access  Private (Faculty only)
export const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    if (activity.facultyId.toString() !== req.faculty._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own activities' 
      });
    }
    
    activity.isArchived = true;
    activity.isPublished = false;
    await activity.save();
    
    res.json({
      success: true,
      message: 'Activity archived successfully'
    });
    
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Publish/Unpublish activity
// @route   PATCH /api/activities/:id/publish
// @access  Private (Faculty only)
export const togglePublishActivity = async (req, res) => {
  try {
    const { isPublished } = req.body;
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    if (activity.facultyId.toString() !== req.faculty._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only publish/unpublish your own activities' 
      });
    }
    
    activity.isPublished = isPublished;
    await activity.save();
    
    res.json({
      success: true,
      data: activity,
      message: isPublished ? 'Activity published' : 'Activity unpublished'
    });
    
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Get activity statistics
// @route   GET /api/activities/:id/stats
// @access  Private (Faculty only)
export const getActivityStats = async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('classId', 'enrolledCount');
    
    if (!activity) {
      return res.status(404).json({ 
        success: false, 
        message: 'Activity not found' 
      });
    }
    
    const totalStudents = activity.classId?.enrolledCount || 0;
    const submitted = activity.submissions?.length || 0;
    const graded = activity.submissions?.filter(s => s.status === 'graded').length || 0;
    const pending = activity.submissions?.filter(s => s.status === 'pending').length || 0;
    
    const scoreDistribution = {
      '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, 'below-60': 0
    };
    
    let highestScore = 0, lowestScore = activity.totalMarks, totalScore = 0, gradedCount = 0;
    
    activity.submissions?.forEach(s => {
      if (s.obtainedMarks !== undefined && s.obtainedMarks !== null) {
        const percentage = (s.obtainedMarks / activity.totalMarks) * 100;
        if (percentage >= 90) scoreDistribution['90-100']++;
        else if (percentage >= 80) scoreDistribution['80-89']++;
        else if (percentage >= 70) scoreDistribution['70-79']++;
        else if (percentage >= 60) scoreDistribution['60-69']++;
        else scoreDistribution['below-60']++;
        
        highestScore = Math.max(highestScore, s.obtainedMarks);
        lowestScore = Math.min(lowestScore, s.obtainedMarks);
        totalScore += s.obtainedMarks;
        gradedCount++;
      }
    });
    
    res.json({
      success: true,
      data: {
        totalStudents,
        submitted,
        notSubmitted: totalStudents - submitted,
        graded,
        pending,
        submissionRate: totalStudents > 0 ? ((submitted / totalStudents) * 100).toFixed(1) : 0,
        gradingProgress: submitted > 0 ? ((graded / submitted) * 100).toFixed(1) : 0,
        averageScore: gradedCount > 0 ? (totalScore / gradedCount).toFixed(2) : 0,
        highestScore,
        lowestScore,
        scoreDistribution
      }
    });
    
  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};