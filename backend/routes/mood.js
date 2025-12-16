const express = require('express');
const router = express.Router();
const moodController = require('../controllers/moodController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { moodValidation } = require('../middleware/validate');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Get mood statistics
router.get('/stats', moodValidation.list, moodController.getMoodStats);

// CRUD operations
router.post('/', moodValidation.create, moodController.createMoodEntry);
router.get('/', moodValidation.list, moodController.getMoodEntries);
router.get('/:id', moodValidation.getById, moodController.getMoodEntry);
router.put('/:id', moodValidation.update, moodController.updateMoodEntry);
router.delete('/:id', moodValidation.getById, moodController.deleteMoodEntry);

module.exports = router;
