const express = require('express');
const router = express.Router();
const userSettingsController = require('../controllers/userSettingsController');
const { authenticateAndLoadUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateAndLoadUser);

// User settings (goal preferences)
router.get('/', userSettingsController.getSettings);
router.patch('/', userSettingsController.updateSettings);

module.exports = router;
