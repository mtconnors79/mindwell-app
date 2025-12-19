const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const crypto = require('crypto');

const CareCircleConnection = sequelize.define('CareCircleConnection', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  patient_user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  trusted_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  trusted_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  trusted_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  sharing_tier: {
    type: DataTypes.ENUM('full', 'data_only'),
    defaultValue: 'data_only',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'declined', 'revoked'),
    defaultValue: 'pending',
    allowNull: false
  },
  invite_token: {
    type: DataTypes.STRING(128),
    unique: true,
    allowNull: false
  },
  invite_token_expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  invited_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  accepted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  revoked_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  revoked_by: {
    type: DataTypes.ENUM('patient', 'trusted_person'),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'care_circle_connections',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['patient_user_id'] },
    { fields: ['trusted_user_id'] },
    { fields: ['trusted_email'] },
    { fields: ['invite_token'], unique: true },
    { fields: ['status'] },
    { fields: ['patient_user_id', 'status'] },
    { fields: ['trusted_user_id', 'status'] }
  ]
});

// Static method: Generate a secure invite token
CareCircleConnection.generateInviteToken = () => {
  return crypto.randomBytes(48).toString('hex'); // 96 character token
};

// Static method: Get token expiration date (14 days from now)
CareCircleConnection.getTokenExpirationDate = (days = 14) => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + days);
  return expirationDate;
};

// Static method: Find connection by invite token
CareCircleConnection.findByToken = async function(token) {
  return await this.findOne({
    where: { invite_token: token }
  });
};

// Static method: Expire pending invites older than expiration date
CareCircleConnection.expirePendingInvites = async function() {
  const { Op } = require('sequelize');
  const result = await this.update(
    { status: 'revoked', revoked_at: new Date() },
    {
      where: {
        status: 'pending',
        invite_token_expires_at: {
          [Op.lt]: new Date()
        }
      }
    }
  );
  return result[0]; // Number of affected rows
};

// Instance method: Check if invite token is expired
CareCircleConnection.prototype.isExpired = function() {
  if (!this.invite_token_expires_at) return true;
  return new Date() > new Date(this.invite_token_expires_at);
};

// Instance method: Check if connection is active
CareCircleConnection.prototype.isActive = function() {
  return this.status === 'active' && !this.revoked_at;
};

// Instance method: Check if a user can access this connection's data
CareCircleConnection.prototype.canAccess = function(requestingUserId) {
  // Patient always has access
  if (this.patient_user_id === requestingUserId) {
    return true;
  }

  // Trusted user has access only if connection is active
  if (this.trusted_user_id === requestingUserId && this.isActive()) {
    return true;
  }

  return false;
};

// Instance method: Accept the invitation
CareCircleConnection.prototype.accept = async function(trustedUserId) {
  this.status = 'active';
  this.trusted_user_id = trustedUserId;
  this.accepted_at = new Date();
  await this.save();
  return this;
};

// Instance method: Decline the invitation
CareCircleConnection.prototype.decline = async function() {
  this.status = 'declined';
  await this.save();
  return this;
};

// Instance method: Revoke the connection
CareCircleConnection.prototype.revoke = async function(revokedByUserId) {
  const isPatient = this.patient_user_id === revokedByUserId;
  this.status = 'revoked';
  this.revoked_at = new Date();
  this.revoked_by = isPatient ? 'patient' : 'trusted_person';
  await this.save();
  return this;
};

// Instance method: Get sharing permissions based on tier
CareCircleConnection.prototype.getPermissions = function() {
  if (!this.isActive()) {
    return {
      canViewSummary: false,
      canViewCheckins: false,
      canViewMoods: false,
      canExportData: false,
      canReceiveAlerts: false
    };
  }

  if (this.sharing_tier === 'full') {
    return {
      canViewSummary: true,
      canViewCheckins: true,
      canViewMoods: true,
      canExportData: true,
      canReceiveAlerts: true
    };
  }

  // data_only tier
  return {
    canViewSummary: true,
    canViewCheckins: false,
    canViewMoods: true,
    canExportData: false,
    canReceiveAlerts: true
  };
};

module.exports = CareCircleConnection;
