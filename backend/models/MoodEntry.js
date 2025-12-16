const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const MoodEntry = sequelize.define('MoodEntry', {
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
  sentiment_score: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    validate: {
      min: -1.0,
      max: 1.0
    }
  },
  sentiment_label: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  check_in_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'mood_entries',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['check_in_date']
    }
  ]
});

module.exports = MoodEntry;
