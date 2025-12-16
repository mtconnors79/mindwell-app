const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { profileValidation } = require('../middleware/validate');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Profile operations
router.get('/', profileController.getProfile);
router.put('/', profileValidation.update, profileController.updateProfile);
router.delete('/', profileController.resetProfile);

// Preferences operations
router.get('/preferences', profileController.getPreferences);
router.patch('/preferences', profileValidation.updatePreferences, profileController.updatePreferences);
router.delete('/preferences/:key', profileValidation.deletePreference, profileController.deletePreference);

module.exports = router;
