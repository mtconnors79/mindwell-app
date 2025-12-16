const express = require('express');
const router = express.Router();
const emergencyContactController = require('../controllers/emergencyContactController');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { emergencyContactValidation } = require('../middleware/validate');

// All routes require authentication
router.use(authenticateAndLoadUser);

// Reorder contacts
router.put('/reorder', emergencyContactValidation.reorder, emergencyContactController.reorderContacts);

// CRUD operations
router.post('/', emergencyContactValidation.create, emergencyContactController.createContact);
router.get('/', emergencyContactController.getContacts);
router.get('/:id', emergencyContactValidation.getById, emergencyContactController.getContact);
router.put('/:id', emergencyContactValidation.update, emergencyContactController.updateContact);
router.delete('/:id', emergencyContactValidation.getById, emergencyContactController.deleteContact);

module.exports = router;
