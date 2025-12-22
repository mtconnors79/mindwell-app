const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { checkinValidation } = require('../middleware/validate');
const { aiLimiter, checkinLimiter } = require('../middleware/rateLimiter');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Get check-in statistics
router.get('/stats', checkinValidation.list, checkinController.getCheckinStats);

// Get daily mood details with time bucket breakdown
router.get('/daily', checkinController.getDailyMoodDetails);

// Analyze text without saving (standalone analysis) - AI rate limited
router.post('/analyze', aiLimiter, checkinController.analyzeText);

// CRUD operations
router.post('/', checkinLimiter, checkinValidation.create, checkinController.createCheckin);
router.get('/', checkinValidation.list, checkinController.getCheckins);
router.get('/:id', checkinValidation.getById, checkinController.getCheckin);
router.put('/:id', checkinValidation.update, checkinController.updateCheckin);
router.delete('/:id', checkinValidation.getById, checkinController.deleteCheckin);

// AI analysis operations - AI rate limited
router.post('/:id/analysis', checkinValidation.addAnalysis, checkinController.addAiAnalysis);
router.post('/:id/analyze', aiLimiter, checkinValidation.getById, checkinController.analyzeCheckin);

module.exports = router;
