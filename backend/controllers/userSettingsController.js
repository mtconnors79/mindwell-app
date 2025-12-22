const { User } = require('../models');

/**
 * GET /api/users/settings
 * Get user settings (goal preferences)
 */
const getSettings = async (req, res) => {
  try {
    const userId = req.user.dbId;

    const user = await User.findByPk(userId, {
      attributes: [
        'goal_notify_achieved',
        'goal_notify_expiring',
        'goal_notify_incomplete',
        'goal_history_retention_days'
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({
      settings: {
        goal_notify_achieved: user.goal_notify_achieved,
        goal_notify_expiring: user.goal_notify_expiring,
        goal_notify_incomplete: user.goal_notify_incomplete,
        goal_history_retention_days: user.goal_history_retention_days
      }
    });
  } catch (error) {
    console.error('Get user settings error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user settings'
    });
  }
};

/**
 * PATCH /api/users/settings
 * Update user settings (goal preferences)
 */
const updateSettings = async (req, res) => {
  try {
    const userId = req.user.dbId;
    const {
      goal_notify_achieved,
      goal_notify_expiring,
      goal_notify_incomplete,
      goal_history_retention_days
    } = req.body;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Build update object with only provided values
    const updates = {};

    if (typeof goal_notify_achieved === 'boolean') {
      updates.goal_notify_achieved = goal_notify_achieved;
    }
    if (typeof goal_notify_expiring === 'boolean') {
      updates.goal_notify_expiring = goal_notify_expiring;
    }
    if (typeof goal_notify_incomplete === 'boolean') {
      updates.goal_notify_incomplete = goal_notify_incomplete;
    }
    if (typeof goal_history_retention_days === 'number') {
      // Validate retention days (0 = forever, max 365)
      if (goal_history_retention_days < 0 || goal_history_retention_days > 365) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'goal_history_retention_days must be between 0 and 365'
        });
      }
      updates.goal_history_retention_days = goal_history_retention_days;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid settings provided'
      });
    }

    await user.update(updates);

    res.json({
      message: 'Settings updated successfully',
      settings: {
        goal_notify_achieved: user.goal_notify_achieved,
        goal_notify_expiring: user.goal_notify_expiring,
        goal_notify_incomplete: user.goal_notify_incomplete,
        goal_history_retention_days: user.goal_history_retention_days
      }
    });
  } catch (error) {
    console.error('Update user settings error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update user settings'
    });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
