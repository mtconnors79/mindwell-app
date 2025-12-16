const notificationService = require('../services/notificationService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Register a device token for push notifications
 */
const registerToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    const result = await notificationService.registerDeviceToken(userId, token);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      message: 'Device token registered successfully',
      tokenCount: result.tokenCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a device token
 */
const removeToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      throw ApiError.badRequest('Device token is required');
    }

    const result = await notificationService.removeDeviceToken(userId, token);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      message: 'Device token removed successfully',
      tokenCount: result.tokenCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get notification status for user
 */
const getStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.getDeviceTokens(userId);

    if (!result.success) {
      throw ApiError.internal(result.error);
    }

    res.json({
      success: true,
      fcmEnabled: notificationService.isEnabled(),
      registeredDevices: result.tokens.length,
      hasTokens: result.tokens.length > 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a test notification to the current user
 */
const sendTest = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await notificationService.sendToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from MindWell.'
    }, {
      type: 'test'
    });

    if (!result.success) {
      return res.json({
        success: false,
        reason: result.reason || result.error
      });
    }

    res.json({
      success: true,
      message: 'Test notification sent',
      results: result.results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger a check-in reminder for the current user
 */
const sendCheckinReminder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    const result = await notificationService.sendCheckinReminder(userId, message);

    if (!result.success) {
      return res.json({
        success: false,
        reason: result.reason || result.error
      });
    }

    res.json({
      success: true,
      message: 'Check-in reminder sent',
      results: result.results
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerToken,
  removeToken,
  getStatus,
  sendTest,
  sendCheckinReminder
};
