const { getMessaging, isFirebaseInitialized } = require('../config/firebase');
const User = require('../models/User');

const isEnabled = () => {
  return process.env.FCM_ENABLED === 'true' && isFirebaseInitialized();
};

/**
 * Send notification to a single user
 */
const sendToUser = async (userId, notification, data = {}) => {
  if (!isEnabled()) {
    console.log('FCM disabled, skipping notification');
    return { success: false, reason: 'FCM disabled' };
  }

  try {
    const user = await User.findByPk(userId);
    if (!user || !user.device_tokens || user.device_tokens.length === 0) {
      return { success: false, reason: 'No device tokens found' };
    }

    const messaging = getMessaging();
    const results = [];

    for (const token of user.device_tokens) {
      try {
        const message = {
          token,
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: {
            ...data,
            click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK'
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: data.channelId || 'default'
            }
          }
        };

        const response = await messaging.send(message);
        results.push({ token, success: true, messageId: response });
      } catch (error) {
        console.error(`Failed to send to token ${token}:`, error.message);
        results.push({ token, success: false, error: error.message });

        // Remove invalid tokens
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          await removeDeviceToken(userId, token);
        }
      }
    }

    return { success: true, results };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple users
 */
const sendToMultipleUsers = async (userIds, notification, data = {}) => {
  if (!isEnabled()) {
    console.log('FCM disabled, skipping notifications');
    return { success: false, reason: 'FCM disabled' };
  }

  const results = [];
  for (const userId of userIds) {
    const result = await sendToUser(userId, notification, data);
    results.push({ userId, ...result });
  }

  return {
    success: true,
    total: userIds.length,
    results
  };
};

/**
 * Send daily check-in reminder
 */
const sendCheckinReminder = async (userId, customMessage = null) => {
  const notification = {
    title: 'Time for your check-in',
    body: customMessage || 'Take a moment to reflect on how you\'re feeling today.'
  };

  return sendToUser(userId, notification, {
    type: 'checkin_reminder',
    channelId: 'reminders'
  });
};

/**
 * Send check-in reminders to all users with notifications enabled
 */
const sendBulkCheckinReminders = async () => {
  if (!isEnabled()) {
    console.log('FCM disabled, skipping bulk reminders');
    return { success: false, reason: 'FCM disabled' };
  }

  try {
    // Find users with device tokens
    const users = await User.findAll({
      where: {
        device_tokens: {
          [require('sequelize').Op.ne]: []
        }
      },
      attributes: ['id']
    });

    const userIds = users.map(u => u.id);

    if (userIds.length === 0) {
      return { success: true, sent: 0, message: 'No users with device tokens' };
    }

    const notification = {
      title: 'Daily Check-in Reminder',
      body: 'How are you feeling today? Take a moment to check in with yourself.'
    };

    const results = await sendToMultipleUsers(userIds, notification, {
      type: 'checkin_reminder',
      channelId: 'reminders'
    });

    return {
      success: true,
      sent: userIds.length,
      results
    };
  } catch (error) {
    console.error('Error sending bulk reminders:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send crisis alert notification
 */
const sendCrisisAlert = async (userId, alertData = {}) => {
  const notification = {
    title: 'We\'re here for you',
    body: alertData.message || 'It looks like you might be going through a difficult time. Remember, help is available.'
  };

  return sendToUser(userId, notification, {
    type: 'crisis_alert',
    channelId: 'crisis',
    priority: 'high',
    resources: JSON.stringify({
      crisisLine: '988',
      crisisText: 'Text HOME to 741741'
    }),
    ...alertData
  });
};

/**
 * Send mood insight notification
 */
const sendMoodInsight = async (userId, insight) => {
  const notification = {
    title: 'Mood Insight',
    body: insight
  };

  return sendToUser(userId, notification, {
    type: 'mood_insight',
    channelId: 'insights'
  });
};

/**
 * Register a device token for a user
 */
const registerDeviceToken = async (userId, token) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const currentTokens = user.device_tokens || [];
    if (!currentTokens.includes(token)) {
      // Create a new array to ensure Sequelize detects the change
      const newTokens = [...currentTokens, token];
      user.device_tokens = newTokens;
      user.changed('device_tokens', true);
      await user.save();
    }

    return { success: true, tokenCount: user.device_tokens.length };
  } catch (error) {
    console.error('Error registering device token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove a device token from a user
 */
const removeDeviceToken = async (userId, token) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const newTokens = (user.device_tokens || []).filter(t => t !== token);
    user.device_tokens = newTokens;
    user.changed('device_tokens', true);
    await user.save();

    return { success: true, tokenCount: newTokens.length };
  } catch (error) {
    console.error('Error removing device token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all device tokens for a user
 */
const getDeviceTokens = async (userId) => {
  try {
    const user = await User.findByPk(userId, {
      attributes: ['device_tokens']
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, tokens: user.device_tokens || [] };
  } catch (error) {
    console.error('Error getting device tokens:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  isEnabled,
  sendToUser,
  sendToMultipleUsers,
  sendCheckinReminder,
  sendBulkCheckinReminders,
  sendCrisisAlert,
  sendMoodInsight,
  registerDeviceToken,
  removeDeviceToken,
  getDeviceTokens
};
