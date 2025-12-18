const express = require('express');
const router = express.Router();
const emergencyContactController = require('../controllers/emergencyContactController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { emergencyContactValidation } = require('../middleware/validate');

// Public routes (no authentication required)
// Confirmation page - serves HTML
router.get('/confirm/:token', emergencyContactController.getConfirmationPage);
// Confirmation response - accepts/declines
router.post('/confirm/:token', emergencyContactController.confirmContact);

// All routes below require authentication
router.use(authenticateAndLoadUser);

// Get active primary contact (for crisis alerts)
router.get('/primary', emergencyContactController.getActivePrimaryContact);

// Reorder contacts
router.put('/reorder', emergencyContactValidation.reorder, emergencyContactController.reorderContacts);

// Resend confirmation SMS
router.post('/:id/resend', emergencyContactValidation.getById, emergencyContactController.resendConfirmation);

// CRUD operations
router.post('/', emergencyContactValidation.create, emergencyContactController.createContact);
router.get('/', emergencyContactController.getContacts);
router.get('/:id', emergencyContactValidation.getById, emergencyContactController.getContact);
router.put('/:id', emergencyContactValidation.update, emergencyContactController.updateContact);
router.delete('/:id', emergencyContactValidation.getById, emergencyContactController.deleteContact);

module.exports = router;
