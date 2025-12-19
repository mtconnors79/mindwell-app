const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();

const { authenticateAndLoadUser } = require('../middleware/auth');
const {
  validateConnectionAccess,
  validatePatientOnly,
  validateSharedDataAccess
} = require('../middleware/careCircleAuth');

const careCircleController = require('../controllers/careCircleController');
const careCircleDataController = require('../controllers/careCircleDataController');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      message: errors.array().map(e => e.msg).join(', '),
      details: errors.array()
    });
  }
  next();
};

// UUID format validator
const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * GET /invite/:token
 * Get invite details (PUBLIC - for acceptance page)
 */
router.get(
  '/invite/:token',
  [
    param('token')
      .isString()
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid invite token format')
  ],
  handleValidationErrors,
  careCircleController.getInviteDetails
);

/**
 * POST /decline/:token
 * Decline invitation (PUBLIC - can decline without account)
 */
router.post(
  '/decline/:token',
  [
    param('token')
      .isString()
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid invite token format')
  ],
  handleValidationErrors,
  careCircleController.declineInvite
);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// Apply authentication to all routes below this line
router.use(authenticateAndLoadUser);

/**
 * POST /invite
 * Patient invites a trusted person
 */
router.post(
  '/invite',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email address is required'),
    body('name')
      .optional()
      .isString()
      .isLength({ max: 255 })
      .trim()
      .withMessage('Name must be less than 255 characters'),
    body('sharing_tier')
      .optional()
      .isIn(['full', 'data_only'])
      .withMessage('sharing_tier must be "full" or "data_only"')
  ],
  handleValidationErrors,
  careCircleController.invite
);

/**
 * GET /connections
 * List all connections for current user (as patient AND as trusted person)
 */
router.get(
  '/connections',
  careCircleController.getConnections
);

/**
 * POST /accept/:token
 * Accept invitation (requires auth - trusted person must be logged in)
 */
router.post(
  '/accept/:token',
  [
    param('token')
      .isString()
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid invite token format')
  ],
  handleValidationErrors,
  careCircleController.acceptInvite
);

/**
 * PUT /:id/tier
 * Change sharing tier (patient only)
 */
router.put(
  '/:id/tier',
  [
    param('id')
      .custom(isValidUUID)
      .withMessage('Invalid connection ID format'),
    body('sharing_tier')
      .isIn(['full', 'data_only'])
      .withMessage('sharing_tier must be "full" or "data_only"')
  ],
  handleValidationErrors,
  careCircleController.updateTier
);

/**
 * POST /:id/resend
 * Resend invitation (patient only)
 */
router.post(
  '/:id/resend',
  [
    param('id')
      .custom(isValidUUID)
      .withMessage('Invalid connection ID format')
  ],
  handleValidationErrors,
  careCircleController.resendInvite
);

/**
 * DELETE /:id
 * Revoke/disconnect (either party)
 */
router.delete(
  '/:id',
  [
    param('id')
      .custom(isValidUUID)
      .withMessage('Invalid connection ID format')
  ],
  handleValidationErrors,
  careCircleController.revokeConnection
);

/**
 * GET /audit/:connectionId
 * Get audit log for a connection (patient only)
 */
router.get(
  '/audit/:connectionId',
  [
    param('connectionId')
      .custom(isValidUUID)
      .withMessage('Invalid connection ID format'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
  ],
  handleValidationErrors,
  careCircleController.getAuditLog
);

// ============================================
// SHARED DATA ROUTES (Trusted person viewing patient data)
// ============================================

/**
 * GET /shared/:patientId/summary
 * Get dashboard overview for a patient (trusted person only)
 */
router.get(
  '/shared/:patientId/summary',
  [
    param('patientId')
      .isInt({ min: 1 })
      .withMessage('Invalid patient ID format')
  ],
  handleValidationErrors,
  validateSharedDataAccess,
  careCircleDataController.getSharedSummary
);

/**
 * GET /shared/:patientId/moods
 * Get mood entries for a patient (trusted person only)
 */
router.get(
  '/shared/:patientId/moods',
  [
    param('patientId')
      .isInt({ min: 1 })
      .withMessage('Invalid patient ID format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
  ],
  handleValidationErrors,
  validateSharedDataAccess,
  careCircleDataController.getSharedMoods
);

/**
 * GET /shared/:patientId/checkins
 * Get check-in entries for a patient (trusted person only)
 * Respects sharing_tier: data_only excludes checkin_text and ai_response
 */
router.get(
  '/shared/:patientId/checkins',
  [
    param('patientId')
      .isInt({ min: 1 })
      .withMessage('Invalid patient ID format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('offset must be a non-negative integer')
  ],
  handleValidationErrors,
  validateSharedDataAccess,
  careCircleDataController.getSharedCheckins
);

/**
 * GET /shared/:patientId/trends
 * Get trend analysis for a patient (trusted person only)
 */
router.get(
  '/shared/:patientId/trends',
  [
    param('patientId')
      .isInt({ min: 1 })
      .withMessage('Invalid patient ID format'),
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d'])
      .withMessage('period must be 7d, 30d, or 90d')
  ],
  handleValidationErrors,
  validateSharedDataAccess,
  careCircleDataController.getSharedTrends
);

/**
 * GET /shared/:patientId/export
 * Export patient data (trusted person only)
 * Respects sharing_tier for data inclusion
 */
router.get(
  '/shared/:patientId/export',
  [
    param('patientId')
      .isInt({ min: 1 })
      .withMessage('Invalid patient ID format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be a valid ISO 8601 date'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be a valid ISO 8601 date'),
    query('format')
      .optional()
      .isIn(['json'])
      .withMessage('format must be json (PDF coming soon)')
  ],
  handleValidationErrors,
  validateSharedDataAccess,
  careCircleDataController.exportSharedData
);

module.exports = router;
