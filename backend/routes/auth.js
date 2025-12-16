const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, authenticateAndLoadUser } = require('../middleware/auth');
const { authValidation } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// Standard registration (email/password)
router.post('/register', authLimiter, authValidation.register, authController.register);

// Firebase registration (after Firebase client-side signup)
router.post('/register/firebase', authLimiter, authController.registerWithFirebase);

// Standard login (email/password)
router.post('/login', authLimiter, authValidation.login, authController.login);

// Firebase login (verify token and get/create user)
router.post('/login/firebase', authLimiter, authController.loginWithFirebase);

// Get current user (requires authentication)
router.get('/me', authenticateAndLoadUser, authController.getMe);

module.exports = router;
