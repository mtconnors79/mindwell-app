const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validate');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Token validation
const tokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Device token is required')
    .isString()
    .withMessage('Device token must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid device token length'),
  handleValidationErrors
];

// Register device token for push notifications
router.post('/token', tokenValidation, notificationController.registerToken);

// Remove device token
router.delete('/token', tokenValidation, notificationController.removeToken);

// Get notification status
router.get('/status', notificationController.getStatus);

// Send test notification
router.post('/test', notificationController.sendTest);

// Request check-in reminder
router.post('/reminder', notificationController.sendCheckinReminder);

module.exports = router;
