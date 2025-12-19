const { CareCircleConnection, CareCircleAuditLog, User, Profile } = require('../models');
const { Op } = require('sequelize');
const crypto = require('crypto');
const emailService = require('../services/emailService');

// Helper: Get IP address from request
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.socket?.remoteAddress ||
         req.ip ||
         null;
};

// Helper: Get user agent from request
const getUserAgent = (req) => {
  const ua = req.headers['user-agent'];
  return ua ? ua.substring(0, 500) : null;
};

// Helper: Log audit action
const logAuditAction = async (params) => {
  const { connectionId, actorUserId, actionType, details, req } = params;

  try {
    await CareCircleAuditLog.logAction({
      connectionId,
      actorUserId,
      actionType,
      details,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null
    });
  } catch (error) {
    console.error('Failed to log audit action:', error.message);
    // Don't throw - audit logging should not break main operations
  }
};

// Helper: Send email non-blocking (fire and forget)
const sendEmailAsync = (emailFunction, options, emailType) => {
  emailFunction(options)
    .then(() => {
      console.log(`Email sent: ${emailType} to ${options.toEmail}`);
    })
    .catch((error) => {
      console.error(`Failed to send ${emailType} email to ${options.toEmail}:`, error.message);
    });
};

// Helper: Get invite URL
const getInviteUrl = (token) => {
  const baseUrl = process.env.WEB_APP_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  return `${baseUrl}/api/care-circle/invite/${token}`;
};

/**
 * POST /invite
 * Patient invites a trusted person
 */
const invite = async (req, res) => {
  try {
    const { email, name, sharing_tier } = req.body;
    const patientUserId = req.user.dbId;

    // Validate email format
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid email address is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Cannot invite yourself
    if (normalizedEmail === req.user.email?.toLowerCase()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot add yourself as a trusted person'
      });
    }

    // Validate sharing tier
    const validTiers = ['full', 'data_only'];
    const tier = sharing_tier && validTiers.includes(sharing_tier) ? sharing_tier : 'data_only';

    // Check for existing active or pending connection with same email
    const existingConnection = await CareCircleConnection.findOne({
      where: {
        patient_user_id: patientUserId,
        trusted_email: normalizedEmail,
        status: { [Op.in]: ['active', 'pending'] }
      }
    });

    if (existingConnection) {
      if (existingConnection.status === 'active') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'This person is already in your Care Circle'
        });
      }
      if (existingConnection.status === 'pending') {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An invitation is already pending for this email'
        });
      }
    }

    // Generate secure token and set expiration (7 days)
    const inviteToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create connection
    const connection = await CareCircleConnection.create({
      patient_user_id: patientUserId,
      trusted_email: normalizedEmail,
      trusted_name: name || null,
      sharing_tier: tier,
      status: 'pending',
      invite_token: inviteToken,
      invite_token_expires_at: expiresAt,
      invited_at: new Date()
    });

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: patientUserId,
      actionType: 'invited',
      details: { trusted_email: normalizedEmail, sharing_tier: tier },
      req
    });

    // Get patient name for invite message
    const patientProfile = await Profile.findOne({
      where: { user_id: patientUserId }
    });
    const patientName = patientProfile?.name || req.user.email?.split('@')[0] || 'Someone';

    // Send invitation email (non-blocking)
    sendEmailAsync(
      emailService.sendCareCircleInvite,
      {
        toEmail: normalizedEmail,
        patientName,
        inviteToken,
        sharingTier: tier,
        expiresAt: expiresAt,
        trustedName: name || null
      },
      'CareCircleInvite'
    );

    res.status(201).json({
      message: 'Invitation created successfully',
      connection: {
        id: connection.id,
        trusted_email: connection.trusted_email,
        trusted_name: connection.trusted_name,
        sharing_tier: connection.sharing_tier,
        status: connection.status,
        invited_at: connection.invited_at,
        expires_at: connection.invite_token_expires_at
      },
      invite_url: getInviteUrl(inviteToken),
      invite_message: `${patientName} would like to add you to their Care Circle on SoulBloom. Accept here: ${getInviteUrl(inviteToken)}`,
      email_sent: true
    });
  } catch (error) {
    console.error('Care Circle invite error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create invitation'
    });
  }
};

/**
 * GET /connections
 * List all connections for current user (as patient AND as trusted person)
 */
const getConnections = async (req, res) => {
  try {
    const userId = req.user.dbId;

    // Expire old pending invites
    await CareCircleConnection.expirePendingInvites();

    // 30 days ago cutoff for filtering old declined/revoked
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Connections as patient
    const asPatient = await CareCircleConnection.findAll({
      where: {
        patient_user_id: userId,
        [Op.or]: [
          { status: { [Op.in]: ['active', 'pending'] } },
          {
            status: { [Op.in]: ['declined', 'revoked'] },
            updated_at: { [Op.gte]: thirtyDaysAgo }
          }
        ]
      },
      include: [{
        model: User,
        as: 'trustedUser',
        attributes: ['id', 'email'],
        include: [{
          model: Profile,
          as: 'profile',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    // Connections as trusted person
    const asTrustedPerson = await CareCircleConnection.findAll({
      where: {
        trusted_user_id: userId,
        [Op.or]: [
          { status: { [Op.in]: ['active', 'pending'] } },
          {
            status: { [Op.in]: ['declined', 'revoked'] },
            updated_at: { [Op.gte]: thirtyDaysAgo }
          }
        ]
      },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'email'],
        include: [{
          model: Profile,
          as: 'profile',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']]
    });

    // Format responses
    const formatPatientConnection = (conn) => ({
      id: conn.id,
      trusted_email: conn.trusted_email,
      trusted_name: conn.trusted_name || conn.trustedUser?.profile?.name || null,
      trusted_user_id: conn.trusted_user_id,
      sharing_tier: conn.sharing_tier,
      status: conn.status,
      invited_at: conn.invited_at,
      accepted_at: conn.accepted_at,
      revoked_at: conn.revoked_at,
      revoked_by: conn.revoked_by,
      expires_at: conn.status === 'pending' ? conn.invite_token_expires_at : null,
      is_expired: conn.status === 'pending' && conn.isExpired()
    });

    const formatTrustedConnection = (conn) => ({
      id: conn.id,
      patient_name: conn.patient?.profile?.name || conn.patient?.email?.split('@')[0] || 'Unknown',
      patient_user_id: conn.patient_user_id,
      sharing_tier: conn.sharing_tier,
      status: conn.status,
      accepted_at: conn.accepted_at,
      revoked_at: conn.revoked_at,
      revoked_by: conn.revoked_by,
      permissions: conn.getPermissions()
    });

    res.json({
      asPatient: asPatient.map(formatPatientConnection),
      asTrustedPerson: asTrustedPerson.map(formatTrustedConnection),
      counts: {
        asPatient: {
          total: asPatient.length,
          active: asPatient.filter(c => c.status === 'active').length,
          pending: asPatient.filter(c => c.status === 'pending').length
        },
        asTrustedPerson: {
          total: asTrustedPerson.length,
          active: asTrustedPerson.filter(c => c.status === 'active').length
        }
      }
    });
  } catch (error) {
    console.error('Get connections error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch connections'
    });
  }
};

/**
 * GET /invite/:token
 * Get invite details (PUBLIC - no auth, for acceptance page)
 */
const getInviteDetails = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid invite token format'
      });
    }

    const connection = await CareCircleConnection.findOne({
      where: { invite_token: token },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'email'],
        include: [{
          model: Profile,
          as: 'profile',
          attributes: ['name']
        }]
      }]
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invitation not found or has already been used'
      });
    }

    if (connection.status !== 'pending') {
      const statusMessages = {
        active: 'This invitation has already been accepted',
        declined: 'This invitation has already been declined',
        revoked: 'This invitation has been cancelled'
      };
      return res.status(410).json({
        error: 'Gone',
        message: statusMessages[connection.status] || 'Invitation is no longer valid',
        status: connection.status
      });
    }

    if (connection.isExpired()) {
      return res.status(410).json({
        error: 'Gone',
        message: 'This invitation has expired',
        status: 'expired'
      });
    }

    // Return only non-sensitive info
    const patientName = connection.patient?.profile?.name ||
                       connection.patient?.email?.split('@')[0] ||
                       'A SoulBloom user';

    res.json({
      patient_name: patientName,
      sharing_tier: connection.sharing_tier,
      sharing_tier_description: connection.sharing_tier === 'full'
        ? 'Full access to mood data, check-ins, and summaries'
        : 'Access to mood summaries and trends only',
      invited_at: connection.invited_at,
      expires_at: connection.invite_token_expires_at,
      what_this_means: [
        'You will be able to view their wellness data',
        'You may receive alerts if they request support',
        'You are NOT responsible for their safety',
        'You can disconnect at any time'
      ]
    });
  } catch (error) {
    console.error('Get invite details error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch invitation details'
    });
  }
};

/**
 * POST /accept/:token
 * Accept invitation (requires auth - trusted person must be logged in)
 */
const acceptInvite = async (req, res) => {
  try {
    const { token } = req.params;
    const trustedUserId = req.user.dbId;

    if (!token || token.length < 32) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid invite token format'
      });
    }

    const connection = await CareCircleConnection.findOne({
      where: { invite_token: token },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['id', 'email'],
        include: [{
          model: Profile,
          as: 'profile',
          attributes: ['name']
        }]
      }]
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invitation not found'
      });
    }

    // Cannot accept your own invitation
    if (connection.patient_user_id === trustedUserId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot accept your own invitation'
      });
    }

    if (connection.status !== 'pending') {
      const statusMessages = {
        active: 'This invitation has already been accepted',
        declined: 'This invitation has been declined',
        revoked: 'This invitation has been cancelled'
      };
      return res.status(400).json({
        error: 'Bad Request',
        message: statusMessages[connection.status] || 'Invitation cannot be accepted'
      });
    }

    if (connection.isExpired()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has expired'
      });
    }

    // Accept the invitation
    await connection.accept(trustedUserId);

    // Clear the token after acceptance
    await connection.update({
      invite_token: crypto.randomBytes(48).toString('hex'), // Replace with random to maintain uniqueness
    });

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'accepted',
      details: { patient_user_id: connection.patient_user_id },
      req
    });

    const patientName = connection.patient?.profile?.name ||
                       connection.patient?.email?.split('@')[0] ||
                       'User';

    // Get trusted person's name for the notification email
    const trustedProfile = await Profile.findOne({
      where: { user_id: trustedUserId }
    });
    const trustedPersonName = trustedProfile?.name || req.user.email?.split('@')[0] || 'Someone';

    // Send notification to patient (non-blocking)
    if (connection.patient?.email) {
      sendEmailAsync(
        emailService.sendCareCircleAccepted,
        {
          toEmail: connection.patient.email,
          patientName,
          trustedPersonName,
          trustedPersonEmail: req.user.email
        },
        'CareCircleAccepted'
      );
    }

    res.json({
      message: `You are now connected to ${patientName}'s Care Circle`,
      connection: {
        id: connection.id,
        patient_name: patientName,
        sharing_tier: connection.sharing_tier,
        status: connection.status,
        accepted_at: connection.accepted_at,
        permissions: connection.getPermissions()
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to accept invitation'
    });
  }
};

/**
 * POST /decline/:token
 * Decline invitation (PUBLIC - can decline without account)
 */
const declineInvite = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid invite token format'
      });
    }

    const connection = await CareCircleConnection.findOne({
      where: { invite_token: token },
      include: [{
        model: User,
        as: 'patient',
        attributes: ['email'],
        include: [{ model: Profile, as: 'profile', attributes: ['name'] }]
      }]
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Invitation not found'
      });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has already been processed'
      });
    }

    if (connection.isExpired()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This invitation has expired'
      });
    }

    // Decline the invitation
    await connection.decline();

    // Clear the token
    await connection.update({
      invite_token: crypto.randomBytes(48).toString('hex')
    });

    // Log audit action (use patient_user_id as actor since we don't have trusted user)
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: connection.patient_user_id, // Attribute to patient for now
      actionType: 'declined',
      details: { declined_by: 'invited_person' },
      req
    });

    // Send notification to patient (non-blocking, optional gentle message)
    const patientName = connection.patient?.profile?.name || 'there';
    if (connection.patient?.email) {
      sendEmailAsync(
        emailService.sendCareCircleDeclined,
        {
          toEmail: connection.patient.email,
          patientName,
          trustedPersonEmail: connection.trusted_email,
          trustedPersonName: connection.trusted_name
        },
        'CareCircleDeclined'
      );
    }

    res.json({
      message: 'Invitation declined',
      status: 'declined'
    });
  } catch (error) {
    console.error('Decline invite error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to decline invitation'
    });
  }
};

/**
 * PUT /:id/tier
 * Change sharing tier (patient only)
 */
const updateTier = async (req, res) => {
  try {
    const { id } = req.params;
    const { sharing_tier } = req.body;
    const userId = req.user.dbId;

    // Validate tier
    const validTiers = ['full', 'data_only'];
    if (!sharing_tier || !validTiers.includes(sharing_tier)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'sharing_tier must be "full" or "data_only"'
      });
    }

    const connection = await CareCircleConnection.findByPk(id);

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    // Only patient can change tier
    if (connection.patient_user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the patient can change sharing tier'
      });
    }

    if (connection.status !== 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Can only change tier for active connections'
      });
    }

    const oldTier = connection.sharing_tier;

    if (oldTier === sharing_tier) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Sharing tier is already set to this value'
      });
    }

    await connection.update({ sharing_tier });

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: userId,
      actionType: 'tier_changed',
      details: { old_tier: oldTier, new_tier: sharing_tier },
      req
    });

    res.json({
      message: 'Sharing tier updated successfully',
      connection: {
        id: connection.id,
        sharing_tier: connection.sharing_tier,
        permissions: connection.getPermissions()
      }
    });
  } catch (error) {
    console.error('Update tier error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update sharing tier'
    });
  }
};

/**
 * DELETE /:id
 * Revoke/disconnect (either party)
 */
const revokeConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;

    const connection = await CareCircleConnection.findByPk(id, {
      include: [
        {
          model: User,
          as: 'patient',
          attributes: ['email'],
          include: [{ model: Profile, as: 'profile', attributes: ['name'] }]
        },
        {
          model: User,
          as: 'trustedUser',
          attributes: ['email'],
          include: [{ model: Profile, as: 'profile', attributes: ['name'] }]
        }
      ]
    });

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    // Check authorization - either patient or trusted user can revoke
    const isPatient = connection.patient_user_id === userId;
    const isTrusted = connection.trusted_user_id === userId;

    if (!isPatient && !isTrusted) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to revoke this connection'
      });
    }

    if (connection.status === 'revoked') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Connection has already been revoked'
      });
    }

    // Revoke the connection
    await connection.revoke(userId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: userId,
      actionType: 'revoked',
      details: { revoked_by: isPatient ? 'patient' : 'trusted_person' },
      req
    });

    const otherPartyName = isPatient
      ? (connection.trustedUser?.profile?.name || connection.trusted_email)
      : (connection.patient?.profile?.name || 'User');

    // Get current user's name for notification
    const currentUserProfile = await Profile.findOne({
      where: { user_id: userId }
    });
    const currentUserName = currentUserProfile?.name || req.user.email?.split('@')[0] || 'Someone';

    // Notify the other party (non-blocking)
    if (isPatient && connection.trustedUser?.email) {
      // Patient revoked - notify trusted person
      sendEmailAsync(
        emailService.sendCareCircleRevoked,
        {
          toEmail: connection.trustedUser.email,
          recipientName: connection.trustedUser.profile?.name || connection.trustedUser.email.split('@')[0],
          otherPartyName: currentUserName,
          revokedBy: 'patient',
          wasPatient: true
        },
        'CareCircleRevoked'
      );
    } else if (isTrusted && connection.patient?.email) {
      // Trusted person left - notify patient
      sendEmailAsync(
        emailService.sendCareCircleRevoked,
        {
          toEmail: connection.patient.email,
          recipientName: connection.patient.profile?.name || connection.patient.email.split('@')[0],
          otherPartyName: currentUserName,
          revokedBy: 'trusted_person',
          wasPatient: false
        },
        'CareCircleRevoked'
      );
    }

    res.json({
      message: `Connection with ${otherPartyName} has been revoked`,
      connection: {
        id: connection.id,
        status: connection.status,
        revoked_at: connection.revoked_at,
        revoked_by: connection.revoked_by
      }
    });
  } catch (error) {
    console.error('Revoke connection error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke connection'
    });
  }
};

/**
 * GET /audit/:connectionId
 * Get audit log for a connection (patient only)
 */
const getAuditLog = async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user.dbId;
    const { limit = 50, offset = 0 } = req.query;

    const connection = await CareCircleConnection.findByPk(connectionId);

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    // Only patient can view audit log
    if (connection.patient_user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the patient can view the audit log'
      });
    }

    const auditLogs = await CareCircleAuditLog.findAll({
      where: { connection_id: connectionId },
      include: [{
        model: User,
        as: 'actor',
        attributes: ['id', 'email'],
        include: [{
          model: Profile,
          as: 'profile',
          attributes: ['name']
        }]
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    const totalCount = await CareCircleAuditLog.count({
      where: { connection_id: connectionId }
    });

    const formatAuditEntry = (entry) => ({
      id: entry.id,
      action_type: entry.action_type,
      actor_name: entry.actor?.profile?.name || entry.actor?.email?.split('@')[0] || 'Unknown',
      actor_user_id: entry.actor_user_id,
      details: entry.details,
      ip_address: entry.ip_address,
      created_at: entry.created_at
    });

    res.json({
      audit_logs: auditLogs.map(formatAuditEntry),
      pagination: {
        total: totalCount,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        has_more: totalCount > parseInt(offset, 10) + auditLogs.length
      }
    });
  } catch (error) {
    console.error('Get audit log error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch audit log'
    });
  }
};

/**
 * POST /:id/resend
 * Resend invitation (patient only, for pending connections)
 */
const resendInvite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;

    const connection = await CareCircleConnection.findByPk(id);

    if (!connection) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connection not found'
      });
    }

    if (connection.patient_user_id !== userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only the patient can resend invitations'
      });
    }

    if (connection.status === 'active') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Connection is already active'
      });
    }

    if (connection.status === 'revoked') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot resend a revoked invitation. Create a new one instead.'
      });
    }

    // Generate new token and reset expiration
    const newToken = crypto.randomBytes(48).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await connection.update({
      status: 'pending',
      invite_token: newToken,
      invite_token_expires_at: expiresAt,
      invited_at: new Date()
    });

    // Get patient name
    const patientProfile = await Profile.findOne({
      where: { user_id: userId }
    });
    const patientName = patientProfile?.name || req.user.email?.split('@')[0] || 'Someone';

    // Send invitation email (non-blocking)
    sendEmailAsync(
      emailService.sendCareCircleInvite,
      {
        toEmail: connection.trusted_email,
        patientName,
        inviteToken: newToken,
        sharingTier: connection.sharing_tier,
        expiresAt: expiresAt,
        trustedName: connection.trusted_name
      },
      'CareCircleInviteResend'
    );

    res.json({
      message: 'Invitation resent successfully',
      invite_url: getInviteUrl(newToken),
      invite_message: `${patientName} would like to add you to their Care Circle on SoulBloom. Accept here: ${getInviteUrl(newToken)}`,
      expires_at: expiresAt,
      email_sent: true
    });
  } catch (error) {
    console.error('Resend invite error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resend invitation'
    });
  }
};

module.exports = {
  invite,
  getConnections,
  getInviteDetails,
  acceptInvite,
  declineInvite,
  updateTier,
  revokeConnection,
  getAuditLog,
  resendInvite
};
