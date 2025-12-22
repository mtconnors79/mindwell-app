const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  device_tokens: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false
  },
  goal_notify_achieved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  goal_notify_expiring: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  goal_notify_incomplete: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  goal_history_retention_days: {
    type: DataTypes.INTEGER,
    defaultValue: 90,
    allowNull: false,
    validate: {
      min: 0,
      max: 365
    }
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['email']
    }
  ]
});

module.exports = User;
