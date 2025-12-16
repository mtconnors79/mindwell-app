const { ActivityLog } = require('../models');

const createActivity = async (req, res) => {
  try {
    const { activity_type, activity_name, duration_minutes, notes, completed_at } = req.body;
    const user_id = req.user.dbId;

    if (!activity_type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'activity_type is required'
      });
    }

    const activity = await ActivityLog.create({
      user_id,
      activity_type,
      activity_name: activity_name || null,
      duration_minutes: duration_minutes || null,
      notes: notes || null,
      completed_at: completed_at ? new Date(completed_at) : new Date()
    });

    res.status(201).json({
      message: 'Activity logged successfully',
      activity
    });
  } catch (error) {
    console.error('Create activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log activity'
    });
  }
};

const getActivities = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { start_date, end_date, activity_type, limit = 30, offset = 0 } = req.query;

    const query = { user_id };

    if (activity_type) {
      query.activity_type = activity_type;
    }

    if (start_date || end_date) {
      query.completed_at = {};
      if (start_date) query.completed_at.$gte = new Date(start_date);
      if (end_date) query.completed_at.$lte = new Date(end_date);
    }

    const total = await ActivityLog.countDocuments(query);
    const activities = await ActivityLog.find(query)
      .sort({ completed_at: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    res.json({
      activities,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + activities.length < total
      }
    });
  } catch (error) {
    console.error('Get activities error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activities'
    });
  }
};

const getActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const activity = await ActivityLog.findOne({
      _id: id,
      user_id
    });

    if (!activity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Activity not found'
      });
    }

    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity'
    });
  }
};

const updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;
    const { activity_type, activity_name, duration_minutes, notes, completed_at } = req.body;

    const updateFields = {};
    if (activity_type) updateFields.activity_type = activity_type;
    if (activity_name !== undefined) updateFields.activity_name = activity_name;
    if (duration_minutes !== undefined) updateFields.duration_minutes = duration_minutes;
    if (notes !== undefined) updateFields.notes = notes;
    if (completed_at) updateFields.completed_at = new Date(completed_at);

    const activity = await ActivityLog.findOneAndUpdate(
      { _id: id, user_id },
      { $set: updateFields },
      { new: true }
    );

    if (!activity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Activity not found'
      });
    }

    res.json({
      message: 'Activity updated successfully',
      activity
    });
  } catch (error) {
    console.error('Update activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update activity'
    });
  }
};

const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.dbId;

    const activity = await ActivityLog.findOneAndDelete({
      _id: id,
      user_id
    });

    if (!activity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Activity not found'
      });
    }

    res.json({
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Delete activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete activity'
    });
  }
};

const getActivityStats = async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const { start_date, end_date } = req.query;

    const matchStage = { user_id };

    if (start_date || end_date) {
      matchStage.completed_at = {};
      if (start_date) matchStage.completed_at.$gte = new Date(start_date);
      if (end_date) matchStage.completed_at.$lte = new Date(end_date);
    }

    const stats = await ActivityLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$activity_type',
          count: { $sum: 1 },
          totalMinutes: { $sum: { $ifNull: ['$duration_minutes', 0] } },
          avgMinutes: { $avg: { $ifNull: ['$duration_minutes', 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const totalActivities = stats.reduce((sum, s) => sum + s.count, 0);
    const totalMinutes = stats.reduce((sum, s) => sum + s.totalMinutes, 0);

    // Get streak (consecutive days with activities)
    const streakData = await ActivityLog.aggregate([
      { $match: { user_id } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completed_at' }
          }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < streakData.length; i++) {
      const activityDate = new Date(streakData[i]._id);
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
      } else if (i === 0 && activityDate.getTime() === expectedDate.getTime() - 86400000) {
        // Allow streak to continue if last activity was yesterday
        currentStreak++;
      } else {
        break;
      }
    }

    res.json({
      stats: {
        totalActivities,
        totalMinutes,
        currentStreak,
        byType: stats.map(s => ({
          type: s._id,
          count: s.count,
          totalMinutes: s.totalMinutes,
          avgMinutes: Math.round(s.avgMinutes * 10) / 10
        }))
      }
    });
  } catch (error) {
    console.error('Get activity stats error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity statistics'
    });
  }
};

const getActivityTypes = async (req, res) => {
  try {
    const types = [
      { value: 'meditation', label: 'Meditation' },
      { value: 'breathing', label: 'Breathing Exercise' },
      { value: 'journaling', label: 'Journaling' },
      { value: 'exercise', label: 'Exercise' },
      { value: 'sleep', label: 'Sleep Tracking' },
      { value: 'gratitude', label: 'Gratitude Practice' },
      { value: 'mindfulness', label: 'Mindfulness' },
      { value: 'other', label: 'Other' }
    ];

    res.json({ types });
  } catch (error) {
    console.error('Get activity types error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity types'
    });
  }
};

module.exports = {
  createActivity,
  getActivities,
  getActivity,
  updateActivity,
  deleteActivity,
  getActivityStats,
  getActivityTypes
};
