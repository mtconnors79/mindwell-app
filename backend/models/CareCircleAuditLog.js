const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const CareCircleAuditLog = sequelize.define('CareCircleAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  connection_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'care_circle_connections',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  actor_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  action_type: {
    type: DataTypes.ENUM(
      'invited',
      'accepted',
      'declined',
      'revoked',
      'viewed_summary',
      'viewed_checkins',
      'viewed_moods',
      'exported_data',
      'tier_changed'
    ),
    allowNull: false
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45), // Supports IPv6
    allowNull: true
  },
  user_agent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  tableName: 'care_circle_audit_logs',
  timestamps: false, // Only created_at, no updated_at for audit logs
  indexes: [
    { fields: ['connection_id'] },
    { fields: ['actor_user_id'] },
    { fields: ['action_type'] },
    { fields: ['created_at'] },
    { fields: ['connection_id', 'created_at'] },
    { fields: ['actor_user_id', 'action_type', 'created_at'] }
  ]
});

// Static method: Create an audit log entry
CareCircleAuditLog.logAction = async function(params) {
  const {
    connectionId,
    actorUserId,
    actionType,
    details = null,
    ipAddress = null,
    userAgent = null
  } = params;

  return await this.create({
    connection_id: connectionId,
    actor_user_id: actorUserId,
    action_type: actionType,
    details,
    ip_address: ipAddress,
    user_agent: userAgent
  });
};

// Static method: Get audit history for a connection
CareCircleAuditLog.getConnectionHistory = async function(connectionId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  return await this.findAll({
    where: { connection_id: connectionId },
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

// Static method: Get user activity across all connections
CareCircleAuditLog.getUserActivity = async function(userId, options = {}) {
  const { limit = 50, offset = 0, actionTypes = null } = options;
  const { Op } = require('sequelize');

  const whereClause = { actor_user_id: userId };
  if (actionTypes && actionTypes.length > 0) {
    whereClause.action_type = { [Op.in]: actionTypes };
  }

  return await this.findAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

// Static method: Count actions by type for a connection
CareCircleAuditLog.countActionsByType = async function(connectionId) {
  const { fn, col } = require('sequelize');

  const results = await this.findAll({
    where: { connection_id: connectionId },
    attributes: [
      'action_type',
      [fn('COUNT', col('id')), 'count']
    ],
    group: ['action_type'],
    raw: true
  });

  return results.reduce((acc, row) => {
    acc[row.action_type] = parseInt(row.count, 10);
    return acc;
  }, {});
};

// Static method: Get recent access logs for a patient's data
CareCircleAuditLog.getRecentAccessLogs = async function(connectionIds, options = {}) {
  const { limit = 20, accessTypesOnly = true } = options;
  const { Op } = require('sequelize');

  const accessTypes = [
    'viewed_summary',
    'viewed_checkins',
    'viewed_moods',
    'exported_data'
  ];

  const whereClause = {
    connection_id: { [Op.in]: connectionIds }
  };

  if (accessTypesOnly) {
    whereClause.action_type = { [Op.in]: accessTypes };
  }

  return await this.findAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit
  });
};

module.exports = CareCircleAuditLog;
