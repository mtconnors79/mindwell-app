const { CareCircleConnection } = require('../models');

/**
 * Middleware: Validate that current user has access to a connection
 * User must be either the patient OR an active trusted person
 *
 * Expects: req.params.id or req.params.connectionId to contain the connection ID
 * Sets: req.careCircleConnection with the loaded connection
 */
const validateConnectionAccess = async (req, res, next) => {
  try {
    const connectionId = req.params.id || req.params.connectionId;
    const userId = req.user?.dbId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!connectionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Connection ID is required'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid connection ID format'
      });
    }

    const connection = await CareCircleConnection.findByPk(connectionId);

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    // Check if user has access
    if (!connection.canAccess(userId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have access to this connection'
      });
    }

    // Attach connection to request for use in controller
    req.careCircleConnection = connection;
    req.isPatient = connection.patient_user_id === userId;
    req.isTrustedPerson = connection.trusted_user_id === userId;

    next();
  } catch (error) {
    console.error('validateConnectionAccess error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate connection access'
    });
  }
};

/**
 * Middleware: Validate that current user is the patient for a connection
 * Only the patient can perform certain actions (change tier, view audit log)
 *
 * Expects: req.params.id or req.params.connectionId to contain the connection ID
 * Sets: req.careCircleConnection with the loaded connection
 */
const validatePatientOnly = async (req, res, next) => {
  try {
    const connectionId = req.params.id || req.params.connectionId;
    const userId = req.user?.dbId;

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!connectionId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Connection ID is required'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(connectionId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid connection ID format'
      });
    }

    const connection = await CareCircleConnection.findByPk(connectionId);

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    // Only patient is allowed
    if (connection.patient_user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the patient can perform this action'
      });
    }

    // Attach connection to request for use in controller
    req.careCircleConnection = connection;
    req.isPatient = true;

    next();
  } catch (error) {
    console.error('validatePatientOnly error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate patient access'
    });
  }
};

/**
 * Middleware: Validate that the connection is active
 * Used for operations that require an active connection
 *
 * Must be used AFTER validateConnectionAccess or validatePatientOnly
 * Expects: req.careCircleConnection to be set
 */
const requireActiveConnection = async (req, res, next) => {
  try {
    const connection = req.careCircleConnection;

    if (!connection) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Connection not loaded. Use validateConnectionAccess first.'
      });
    }

    if (!connection.isActive()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This connection is not active'
      });
    }

    next();
  } catch (error) {
    console.error('requireActiveConnection error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate connection status'
    });
  }
};

/**
 * Middleware: Check sharing tier permissions
 * Creates a function that can check specific permissions based on tier
 *
 * Must be used AFTER validateConnectionAccess
 * Expects: req.careCircleConnection to be set
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const connection = req.careCircleConnection;

      if (!connection) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Connection not loaded. Use validateConnectionAccess first.'
        });
      }

      const permissions = connection.getPermissions();

      if (!permissions[permission]) {
        return res.status(403).json({
          error: 'Forbidden',
          message: `Your sharing tier does not allow ${permission.replace(/([A-Z])/g, ' $1').toLowerCase()}`
        });
      }

      next();
    } catch (error) {
      console.error('requirePermission error:', error.message);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to validate permissions'
      });
    }
  };
};

/**
 * Middleware: Validate that current user can access shared patient data
 * Finds active connection where trusted_user_id = current user AND patient_user_id = patientId param
 *
 * Expects: req.params.patientId to contain the patient's user ID
 * Sets: req.careCircleConnection with the loaded connection
 * Sets: req.sharingTier with the connection's sharing tier
 * Sets: req.patientUserId with the patient's user ID
 */
const validateSharedDataAccess = async (req, res, next) => {
  try {
    const patientId = req.params.patientId;
    const trustedUserId = req.user?.dbId;

    if (!trustedUserId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!patientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Patient ID is required'
      });
    }

    // Validate patientId is a valid integer
    const parsedPatientId = parseInt(patientId, 10);
    if (isNaN(parsedPatientId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid patient ID format'
      });
    }

    // Find active connection where current user is the trusted person
    const connection = await CareCircleConnection.findOne({
      where: {
        patient_user_id: parsedPatientId,
        trusted_user_id: trustedUserId,
        status: 'active'
      }
    });

    if (!connection) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have an active Care Circle connection with this patient'
      });
    }

    // Verify connection is truly active
    if (!connection.isActive()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Your Care Circle connection is no longer active'
      });
    }

    // Attach connection data to request
    req.careCircleConnection = connection;
    req.sharingTier = connection.sharing_tier;
    req.patientUserId = parsedPatientId;
    req.isTrustedPerson = true;
    req.isPatient = false;

    next();
  } catch (error) {
    console.error('validateSharedDataAccess error:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate data access'
    });
  }
};

module.exports = {
  validateConnectionAccess,
  validatePatientOnly,
  requireActiveConnection,
  requirePermission,
  validateSharedDataAccess
};
