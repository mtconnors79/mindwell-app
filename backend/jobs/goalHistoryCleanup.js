const cron = require('node-cron');
const { UserGoal, User } = require('../models');
const { Op } = require('sequelize');

let cleanupJob = null;

/**
 * Clean up old goal history based on user preferences
 * Each user has a goal_history_retention_days setting (default 90)
 */
const cleanupGoalHistory = async () => {
  console.log('[GoalHistoryCleanup] Starting goal history cleanup...');

  try {
    // Get users with custom retention settings or default 90 days
    const users = await User.findAll({
      attributes: ['id', 'goal_history_retention_days']
    });

    let totalDeleted = 0;

    for (const user of users) {
      const retentionDays = user.goal_history_retention_days || 90;

      // Skip if retention is 0 (keep forever)
      if (retentionDays === 0) {
        continue;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Delete inactive goals older than retention period
      const deleted = await UserGoal.destroy({
        where: {
          user_id: user.id,
          is_active: false,
          updated_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      if (deleted > 0) {
        console.log(`[GoalHistoryCleanup] Deleted ${deleted} old goals for user ${user.id}`);
        totalDeleted += deleted;
      }
    }

    console.log(`[GoalHistoryCleanup] Cleanup complete. Total deleted: ${totalDeleted}`);
    return { success: true, deleted: totalDeleted };
  } catch (error) {
    console.error('[GoalHistoryCleanup] Error during cleanup:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Initialize the cleanup cron job
 * Runs daily at 3:00 AM to avoid peak hours
 */
const initializeCleanupJob = () => {
  console.log('[GoalHistoryCleanup] Initializing cleanup cron job...');

  cleanupJob = cron.schedule('0 3 * * *', async () => {
    console.log('[GoalHistoryCleanup] Running scheduled cleanup...');
    await cleanupGoalHistory();
  }, {
    timezone: 'America/Los_Angeles'
  });

  console.log('[GoalHistoryCleanup] Cleanup job initialized - runs daily at 3:00 AM');
};

/**
 * Stop the cleanup job
 */
const stopCleanupJob = () => {
  if (cleanupJob) {
    cleanupJob.stop();
    console.log('[GoalHistoryCleanup] Cleanup job stopped');
  }
};

module.exports = {
  cleanupGoalHistory,
  initializeCleanupJob,
  stopCleanupJob
};
