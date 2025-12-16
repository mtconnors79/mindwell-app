const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: true,
    index: true
  },
  activity_type: {
    type: String,
    required: true,
    enum: ['meditation', 'breathing', 'journaling', 'exercise', 'sleep', 'gratitude', 'mindfulness', 'other'],
    index: true
  },
  activity_name: {
    type: String,
    default: null
  },
  duration_minutes: {
    type: Number,
    min: 0,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  completed_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  collection: 'activity_logs',
  timestamps: false
});

// Compound index for querying user activities by date range
activityLogSchema.index({ user_id: 1, completed_at: -1 });

// Index for activity type analytics
activityLogSchema.index({ user_id: 1, activity_type: 1, completed_at: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
