const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const ActivityCompletion = sequelize.define('ActivityCompletion', {
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
  activity_id: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'activity_completions',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['activity_id']
    },
    {
      fields: ['completed_at']
    },
    {
      fields: ['user_id', 'completed_at']
    }
  ]
});

module.exports = ActivityCompletion;
