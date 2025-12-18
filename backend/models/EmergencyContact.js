const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');
const crypto = require('crypto');

const EmergencyContact = sequelize.define('EmergencyContact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  relationship: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'declined', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  confirmation_token: {
    type: DataTypes.STRING(64),
    allowNull: true,
    unique: true
  },
  token_expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
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
  tableName: 'emergency_contacts',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['confirmation_token'],
      unique: true
    },
    {
      fields: ['status']
    }
  ],
  hooks: {
    beforeUpdate: (contact) => {
      contact.updated_at = new Date();
    }
  }
});

// Generate a unique confirmation token
EmergencyContact.generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Check if token is expired
EmergencyContact.prototype.isTokenExpired = function() {
  if (!this.token_expires_at) return true;
  return new Date() > new Date(this.token_expires_at);
};

// Expire tokens older than 14 days
EmergencyContact.expireOldTokens = async function() {
  const result = await EmergencyContact.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        token_expires_at: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    }
  );
  return result[0]; // Returns number of affected rows
};

module.exports = EmergencyContact;
