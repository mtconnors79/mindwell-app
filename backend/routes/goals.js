const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const { authenticateAndLoadUser } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Templates endpoint (must be before /:id routes)
router.get('/templates', goalsController.getGoalTemplates);

// Summary statistics (must be before /:id routes)
router.get('/summary', goalsController.getGoalsSummary);

// Goal history routes (must be before /:id routes)
router.get('/history', goalsController.getGoalHistory);
router.delete('/history', goalsController.deleteGoalHistory);

// Active goals - CRUD operations
router.get('/', goalsController.getActiveGoals);
router.post('/', goalsController.createGoal);
router.get('/:id', goalsController.getGoal);
router.put('/:id', goalsController.updateGoal);
router.delete('/:id', goalsController.deleteGoal);

// Complete a goal
router.post('/:id/complete', goalsController.completeGoal);

module.exports = router;
