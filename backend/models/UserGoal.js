const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const UserGoal = sequelize.define('UserGoal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
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
  title: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      len: [1, 50]
    }
  },
  activity_type: {
    type: DataTypes.ENUM('check_in', 'quick_mood', 'mindfulness', 'breathing', 'journaling'),
    allowNull: false
  },
  target_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 100
    }
  },
  time_frame: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
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
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_goals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['user_id', 'is_active']
    },
    {
      fields: ['activity_type']
    },
    {
      fields: ['completed_at']
    }
  ]
});

module.exports = UserGoal;
