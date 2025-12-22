const { Op } = require('sequelize');
const { MoodEntry, ActivityCompletion } = require('../models');
const CheckinResponse = require('../models/CheckinResponse');

/**
 * Get the date range for a given time frame
 * @param {string} timeFrame - 'daily', 'weekly', or 'monthly'
 * @returns {{ startDate: Date, endDate: Date }}
 */
const getDateRange = (timeFrame) => {
  const now = new Date();
  let startDate, endDate;

  switch (timeFrame) {
    case 'daily':
      // Today: midnight to end of day
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case 'weekly':
      // This week: Monday to Sunday
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday is 0
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset, 0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;

    case 'monthly':
      // This month: 1st to last day
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    default:
      throw new Error(`Invalid time frame: ${timeFrame}`);
  }

  return { startDate, endDate };
};

/**
 * Count check-ins (full check-in flow) for a user in a date range
 * @param {number} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countCheckIns = async (userId, startDate, endDate) => {
  const count = await CheckinResponse.countDocuments({
    user_id: userId,
    created_at: {
      $gte: startDate,
      $lte: endDate
    }
  });
  return count;
};

/**
 * Count quick mood entries (PostgreSQL MoodEntry) for a user in a date range
 * @param {number} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countQuickMoods = async (userId, startDate, endDate) => {
  const count = await MoodEntry.count({
    where: {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });
  return count;
};

/**
 * Count mindfulness activities (all types) for a user in a date range
 * @param {number} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countMindfulness = async (userId, startDate, endDate) => {
  const count = await ActivityCompletion.count({
    where: {
      user_id: userId,
      completed_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });
  return count;
};

/**
 * Count breathing exercises for a user in a date range
 * @param {number} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countBreathing = async (userId, startDate, endDate) => {
  const count = await ActivityCompletion.count({
    where: {
      user_id: userId,
      activity_id: {
        [Op.like]: 'breathing%'
      },
      completed_at: {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      }
    }
  });
  return count;
};

/**
 * Count journaling entries (check-ins with notes >= 50 chars) for a user in a date range
 * @param {number} userId
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<number>}
 */
const countJournaling = async (userId, startDate, endDate) => {
  const count = await CheckinResponse.countDocuments({
    user_id: userId,
    created_at: {
      $gte: startDate,
      $lte: endDate
    },
    $expr: {
      $gte: [{ $strLenCP: { $ifNull: ['$check_in_text', ''] } }, 50]
    }
  });
  return count;
};

/**
 * Calculate progress for a single goal
 * @param {Object} goal - UserGoal instance with activity_type, target_count, time_frame, user_id
 * @returns {Promise<{ current: number, target: number, percentComplete: number }>}
 */
const calculateProgress = async (goal) => {
  const { startDate, endDate } = getDateRange(goal.time_frame);
  const userId = goal.user_id;
  let current = 0;

  switch (goal.activity_type) {
    case 'check_in':
      current = await countCheckIns(userId, startDate, endDate);
      break;
    case 'quick_mood':
      current = await countQuickMoods(userId, startDate, endDate);
      break;
    case 'mindfulness':
      current = await countMindfulness(userId, startDate, endDate);
      break;
    case 'breathing':
      current = await countBreathing(userId, startDate, endDate);
      break;
    case 'journaling':
      current = await countJournaling(userId, startDate, endDate);
      break;
    default:
      console.warn(`Unknown activity type: ${goal.activity_type}`);
      current = 0;
  }

  const target = goal.target_count;
  const percentComplete = Math.min(100, Math.round((current / target) * 100));

  return {
    current,
    target,
    percentComplete
  };
};

/**
 * Calculate progress for multiple goals
 * @param {Array} goals - Array of UserGoal instances
 * @returns {Promise<Array>} - Array of goals with progress data
 */
const calculateProgressForGoals = async (goals) => {
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const progress = await calculateProgress(goal);
      return {
        ...goal.toJSON(),
        progress
      };
    })
  );
  return goalsWithProgress;
};

/**
 * Check if a goal should be marked as completed
 * @param {Object} goal - UserGoal instance
 * @returns {Promise<boolean>}
 */
const isGoalCompleted = async (goal) => {
  const progress = await calculateProgress(goal);
  return progress.current >= progress.target;
};

/**
 * Get time remaining in current period
 * @param {string} timeFrame - 'daily', 'weekly', or 'monthly'
 * @returns {{ endDate: Date, hoursRemaining: number, daysRemaining: number }}
 */
const getTimeRemaining = (timeFrame) => {
  const { endDate } = getDateRange(timeFrame);
  const now = new Date();
  const msRemaining = endDate - now;
  const hoursRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60)));
  const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)));

  return {
    endDate,
    hoursRemaining,
    daysRemaining
  };
};

module.exports = {
  calculateProgress,
  calculateProgressForGoals,
  isGoalCompleted,
  getDateRange,
  getTimeRemaining,
  // Export individual counters for testing
  countCheckIns,
  countQuickMoods,
  countMindfulness,
  countBreathing,
  countJournaling
};
