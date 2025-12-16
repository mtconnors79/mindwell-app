const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { activityValidation } = require('../middleware/validate');

// Get activity types (public)
router.get('/types', activityController.getActivityTypes);

// All other routes require authentication
router.use(authenticateAndLoadUser);

// Get activity statistics
router.get('/stats', activityValidation.list, activityController.getActivityStats);

// CRUD operations
router.post('/', activityValidation.create, activityController.createActivity);
router.get('/', activityValidation.list, activityController.getActivities);
router.get('/:id', activityValidation.getById, activityController.getActivity);
router.put('/:id', activityValidation.update, activityController.updateActivity);
router.delete('/:id', activityValidation.getById, activityController.deleteActivity);

module.exports = router;
