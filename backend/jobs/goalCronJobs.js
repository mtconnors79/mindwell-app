const cron = require('node-cron');
const { checkExpiringGoals, checkIncompleteGoals } = require('../services/goalNotificationService');

let expiringGoalsJob = null;
let incompleteGoalsJob = null;

/**
 * Initialize goal-related cron jobs
 */
const initializeGoalCronJobs = () => {
  console.log('[GoalCron] Initializing goal notification cron jobs...');

  // Check for expiring goals daily at 8:00 AM
  // Cron format: minute hour day-of-month month day-of-week
  expiringGoalsJob = cron.schedule('0 8 * * *', async () => {
    console.log('[GoalCron] Running expiring goals check...');
    try {
      await checkExpiringGoals();
    } catch (error) {
      console.error('[GoalCron] Expiring goals check failed:', error.message);
    }
  }, {
    timezone: 'America/Los_Angeles' // Adjust to your users' primary timezone
  });

  // Check for incomplete/expired goals daily at 9:00 AM
  incompleteGoalsJob = cron.schedule('0 9 * * *', async () => {
    console.log('[GoalCron] Running incomplete goals check...');
    try {
      await checkIncompleteGoals();
    } catch (error) {
      console.error('[GoalCron] Incomplete goals check failed:', error.message);
    }
  }, {
    timezone: 'America/Los_Angeles'
  });

  console.log('[GoalCron] Goal notification cron jobs initialized');
  console.log('[GoalCron] - Expiring goals check: daily at 8:00 AM');
  console.log('[GoalCron] - Incomplete goals check: daily at 9:00 AM');
};

/**
 * Stop all goal cron jobs
 */
const stopGoalCronJobs = () => {
  if (expiringGoalsJob) {
    expiringGoalsJob.stop();
    console.log('[GoalCron] Expiring goals job stopped');
  }
  if (incompleteGoalsJob) {
    incompleteGoalsJob.stop();
    console.log('[GoalCron] Incomplete goals job stopped');
  }
};

/**
 * Manually trigger expiring goals check (for testing)
 */
const triggerExpiringGoalsCheck = async () => {
  console.log('[GoalCron] Manually triggering expiring goals check...');
  await checkExpiringGoals();
};

/**
 * Manually trigger incomplete goals check (for testing)
 */
const triggerIncompleteGoalsCheck = async () => {
  console.log('[GoalCron] Manually triggering incomplete goals check...');
  await checkIncompleteGoals();
};

module.exports = {
  initializeGoalCronJobs,
  stopGoalCronJobs,
  triggerExpiringGoalsCheck,
  triggerIncompleteGoalsCheck
};
