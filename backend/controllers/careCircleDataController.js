const { CareCircleConnection, CareCircleAuditLog, User, Profile, MoodEntry } = require('../models');
const { CheckinResponse } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

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
  }
};

// Helper: Convert mood rating to numeric score
const moodRatingToScore = (rating) => {
  const scores = {
    'great': 1.0,
    'good': 0.5,
    'okay': 0.0,
    'not_good': -0.5,
    'terrible': -1.0
  };
  return scores[rating] ?? 0;
};

// Helper: Get mood emoji
const moodRatingToEmoji = (rating) => {
  const emojis = {
    'great': '😄',
    'good': '😊',
    'okay': '😐',
    'not_good': '😟',
    'terrible': '😢'
  };
  return emojis[rating] ?? '😐';
};

// Helper: Get patient display name
const getPatientDisplayName = async (patientUserId) => {
  const profile = await Profile.findOne({
    where: { user_id: patientUserId }
  });

  if (profile?.name) return profile.name;

  const user = await User.findByPk(patientUserId);
  return user?.email?.split('@')[0] || 'User';
};

// Helper: Parse date range from query params
const parseDateRange = (startDate, endDate, defaultDays = 30) => {
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);

  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - defaultDays * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

/**
 * GET /shared/:patientId/summary
 * Returns dashboard overview for trusted person viewing a patient
 */
const getSharedSummary = async (req, res) => {
  try {
    const connection = req.careCircleConnection;
    const patientUserId = connection.patient_user_id;
    const trustedUserId = req.user.dbId;

    // Get date range (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch check-ins from MongoDB
    const checkins = await CheckinResponse.find({
      user_id: patientUserId,
      created_at: { $gte: thirtyDaysAgo }
    }).sort({ created_at: -1 }).lean();

    // Fetch mood entries from PostgreSQL
    const moodEntries = await MoodEntry.findAll({
      where: {
        user_id: patientUserId,
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      order: [['created_at', 'DESC']]
    });

    // Calculate mood trends (aggregated by day)
    const moodTrendsByDay = {};
    checkins.forEach(checkin => {
      const dateKey = new Date(checkin.created_at).toISOString().split('T')[0];
      if (!moodTrendsByDay[dateKey]) {
        moodTrendsByDay[dateKey] = { scores: [], stressLevels: [], emotions: [] };
      }
      moodTrendsByDay[dateKey].scores.push(moodRatingToScore(checkin.mood_rating));
      moodTrendsByDay[dateKey].stressLevels.push(checkin.stress_level);
      if (checkin.selected_emotions) {
        moodTrendsByDay[dateKey].emotions.push(...checkin.selected_emotions);
      }
    });

    // Also include PostgreSQL mood entries
    moodEntries.forEach(entry => {
      const dateKey = new Date(entry.created_at).toISOString().split('T')[0];
      if (!moodTrendsByDay[dateKey]) {
        moodTrendsByDay[dateKey] = { scores: [], stressLevels: [], emotions: [] };
      }
      if (entry.sentiment_score !== null) {
        moodTrendsByDay[dateKey].scores.push(parseFloat(entry.sentiment_score));
      }
    });

    // Convert to array format
    const moodTrends = Object.entries(moodTrendsByDay)
      .map(([date, data]) => ({
        date,
        average_mood: data.scores.length > 0
          ? (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(2)
          : null,
        average_stress: data.stressLevels.length > 0
          ? (data.stressLevels.reduce((a, b) => a + b, 0) / data.stressLevels.length).toFixed(1)
          : null,
        entry_count: data.scores.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate overall averages
    const allMoodScores = checkins.map(c => moodRatingToScore(c.mood_rating));
    const allStressLevels = checkins.map(c => c.stress_level);

    const averageMoodScore = allMoodScores.length > 0
      ? (allMoodScores.reduce((a, b) => a + b, 0) / allMoodScores.length).toFixed(2)
      : null;

    const averageStressLevel = allStressLevels.length > 0
      ? (allStressLevels.reduce((a, b) => a + b, 0) / allStressLevels.length).toFixed(1)
      : null;

    // Calculate emotion frequency
    const emotionCounts = {};
    checkins.forEach(checkin => {
      (checkin.selected_emotions || []).forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    const mostCommonEmotions = Object.entries(emotionCounts)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate check-in streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkinDates = [...new Set(
      checkins.map(c => new Date(c.created_at).toISOString().split('T')[0])
    )].sort().reverse();

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      if (checkinDates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Last check-in date
    const lastCheckin = checkins.length > 0 ? checkins[0].created_at : null;

    // Stress level trends
    const stressTrends = Object.entries(moodTrendsByDay)
      .filter(([_, data]) => data.stressLevels.length > 0)
      .map(([date, data]) => ({
        date,
        average_stress: (data.stressLevels.reduce((a, b) => a + b, 0) / data.stressLevels.length).toFixed(1)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get patient name
    const patientName = await getPatientDisplayName(patientUserId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'viewed_summary',
      details: { period_days: 30 },
      req
    });

    res.json({
      patient_name: patientName,
      sharing_tier: connection.sharing_tier,
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: new Date().toISOString(),
        days: 30
      },
      summary: {
        total_checkins: checkins.length,
        average_mood_score: averageMoodScore,
        average_stress_level: averageStressLevel,
        checkin_streak: streak,
        last_checkin_date: lastCheckin
      },
      mood_trends: moodTrends,
      stress_trends: stressTrends,
      most_common_emotions: mostCommonEmotions
    });
  } catch (error) {
    console.error('Get shared summary error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch summary data'
    });
  }
};

/**
 * GET /shared/:patientId/moods
 * Returns mood entries for a patient
 */
const getSharedMoods = async (req, res) => {
  try {
    const connection = req.careCircleConnection;
    const patientUserId = connection.patient_user_id;
    const trustedUserId = req.user.dbId;

    const { start_date, end_date, limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const { start, end } = parseDateRange(start_date, end_date, 30);

    // Fetch check-ins from MongoDB (these include mood data)
    const checkins = await CheckinResponse.find({
      user_id: patientUserId,
      created_at: { $gte: start, $lte: end }
    })
      .sort({ created_at: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    const totalCheckins = await CheckinResponse.countDocuments({
      user_id: patientUserId,
      created_at: { $gte: start, $lte: end }
    });

    // Format mood entries
    const moodEntries = checkins.map(checkin => ({
      id: checkin._id.toString(),
      mood_score: moodRatingToScore(checkin.mood_rating),
      mood_label: checkin.mood_rating,
      emoji: moodRatingToEmoji(checkin.mood_rating),
      stress_level: checkin.stress_level,
      timestamp: checkin.created_at,
      source: 'checkin'
    }));

    // Also fetch quick moods from PostgreSQL MoodEntry if they exist
    const quickMoods = await MoodEntry.findAll({
      where: {
        user_id: patientUserId,
        created_at: {
          [Op.between]: [start, end]
        }
      },
      order: [['created_at', 'DESC']],
      limit: parsedLimit,
      offset: parsedOffset
    });

    const quickMoodEntries = quickMoods.map(entry => ({
      id: `mood_${entry.id}`,
      mood_score: entry.sentiment_score ? parseFloat(entry.sentiment_score) : null,
      mood_label: entry.sentiment_label,
      emoji: null,
      stress_level: null,
      timestamp: entry.created_at,
      source: 'quick_mood'
    }));

    // Combine and sort by timestamp
    const allMoods = [...moodEntries, ...quickMoodEntries]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, parsedLimit);

    // Get patient name
    const patientName = await getPatientDisplayName(patientUserId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'viewed_moods',
      details: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        count: allMoods.length
      },
      req
    });

    res.json({
      patient_name: patientName,
      sharing_tier: connection.sharing_tier,
      moods: allMoods,
      pagination: {
        total: totalCheckins + quickMoods.length,
        limit: parsedLimit,
        offset: parsedOffset,
        has_more: parsedOffset + allMoods.length < totalCheckins
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Get shared moods error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mood data'
    });
  }
};

/**
 * GET /shared/:patientId/checkins
 * Returns check-in entries for a patient (respects sharing tier)
 */
const getSharedCheckins = async (req, res) => {
  try {
    const connection = req.careCircleConnection;
    const patientUserId = connection.patient_user_id;
    const trustedUserId = req.user.dbId;
    const sharingTier = connection.sharing_tier;

    const { start_date, end_date, limit = 50, offset = 0 } = req.query;
    const parsedLimit = Math.min(parseInt(limit, 10) || 50, 100);
    const parsedOffset = parseInt(offset, 10) || 0;

    const { start, end } = parseDateRange(start_date, end_date, 30);

    // Fetch check-ins from MongoDB
    const checkins = await CheckinResponse.find({
      user_id: patientUserId,
      created_at: { $gte: start, $lte: end }
    })
      .sort({ created_at: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .lean();

    const totalCount = await CheckinResponse.countDocuments({
      user_id: patientUserId,
      created_at: { $gte: start, $lte: end }
    });

    // Format check-ins based on sharing tier
    const formattedCheckins = checkins.map(checkin => {
      const baseData = {
        id: checkin._id.toString(),
        date: checkin.created_at,
        mood_rating: checkin.mood_rating,
        mood_score: moodRatingToScore(checkin.mood_rating),
        mood_emoji: moodRatingToEmoji(checkin.mood_rating),
        stress_level: checkin.stress_level,
        emotions: checkin.selected_emotions || [],
        detected_topics: checkin.ai_analysis?.keywords || [],
        risk_level: checkin.ai_analysis?.risk_level || 'low',
        sentiment: checkin.ai_analysis?.sentiment || null
      };

      // Full tier gets everything including check-in text and AI response
      if (sharingTier === 'full') {
        return {
          ...baseData,
          checkin_text: checkin.check_in_text || null,
          ai_suggestions: checkin.ai_analysis?.suggestions || []
        };
      }

      // data_only tier - exclude sensitive text content
      return baseData;
    });

    // Get patient name
    const patientName = await getPatientDisplayName(patientUserId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'viewed_checkins',
      details: {
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        count: formattedCheckins.length,
        sharing_tier: sharingTier
      },
      req
    });

    res.json({
      patient_name: patientName,
      sharing_tier: sharingTier,
      sharing_tier_note: sharingTier === 'data_only'
        ? 'Check-in text content is hidden based on sharing preferences'
        : null,
      checkins: formattedCheckins,
      pagination: {
        total: totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
        has_more: parsedOffset + formattedCheckins.length < totalCount
      },
      date_range: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  } catch (error) {
    console.error('Get shared checkins error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch check-in data'
    });
  }
};

/**
 * GET /shared/:patientId/trends
 * Returns trend analysis over time period
 */
const getSharedTrends = async (req, res) => {
  try {
    const connection = req.careCircleConnection;
    const patientUserId = connection.patient_user_id;
    const trustedUserId = req.user.dbId;

    const { period = '30d' } = req.query;

    // Parse period
    const periodDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    }[period] || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    // Fetch check-ins
    const checkins = await CheckinResponse.find({
      user_id: patientUserId,
      created_at: { $gte: startDate }
    }).sort({ created_at: 1 }).lean();

    // Calculate weekly averages
    const weeklyData = {};
    checkins.forEach(checkin => {
      const date = new Date(checkin.created_at);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          mood_scores: [],
          stress_levels: [],
          emotions: [],
          risk_flags: { low: 0, moderate: 0, high: 0, critical: 0 },
          checkin_count: 0
        };
      }

      weeklyData[weekKey].mood_scores.push(moodRatingToScore(checkin.mood_rating));
      weeklyData[weekKey].stress_levels.push(checkin.stress_level);
      weeklyData[weekKey].checkin_count++;

      (checkin.selected_emotions || []).forEach(emotion => {
        weeklyData[weekKey].emotions.push(emotion);
      });

      const riskLevel = checkin.ai_analysis?.risk_level || 'low';
      weeklyData[weekKey].risk_flags[riskLevel]++;
    });

    // Format weekly trends
    const weeklyTrends = Object.entries(weeklyData)
      .map(([weekStart, data]) => ({
        week_start: weekStart,
        average_mood: data.mood_scores.length > 0
          ? (data.mood_scores.reduce((a, b) => a + b, 0) / data.mood_scores.length).toFixed(2)
          : null,
        average_stress: data.stress_levels.length > 0
          ? (data.stress_levels.reduce((a, b) => a + b, 0) / data.stress_levels.length).toFixed(1)
          : null,
        checkin_count: data.checkin_count,
        risk_flags: data.risk_flags
      }))
      .sort((a, b) => a.week_start.localeCompare(b.week_start));

    // Calculate emotion frequency across entire period
    const emotionFrequency = {};
    checkins.forEach(checkin => {
      (checkin.selected_emotions || []).forEach(emotion => {
        emotionFrequency[emotion] = (emotionFrequency[emotion] || 0) + 1;
      });
    });

    const topEmotions = Object.entries(emotionFrequency)
      .map(([emotion, count]) => ({ emotion, count, percentage: ((count / checkins.length) * 100).toFixed(1) }))
      .sort((a, b) => b.count - a.count);

    // Calculate overall risk distribution
    const riskDistribution = { low: 0, moderate: 0, high: 0, critical: 0 };
    checkins.forEach(checkin => {
      const risk = checkin.ai_analysis?.risk_level || 'low';
      riskDistribution[risk]++;
    });

    // Check-in frequency by day of week
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    checkins.forEach(checkin => {
      const day = new Date(checkin.created_at).getDay();
      dayOfWeekCounts[day]++;
    });

    const checkinFrequency = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      .map((day, index) => ({ day, count: dayOfWeekCounts[index] }));

    // Get patient name
    const patientName = await getPatientDisplayName(patientUserId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'viewed_summary',
      details: { period, period_days: periodDays, trend_type: 'detailed' },
      req
    });

    res.json({
      patient_name: patientName,
      sharing_tier: connection.sharing_tier,
      period: {
        label: period,
        days: periodDays,
        start: startDate.toISOString(),
        end: new Date().toISOString()
      },
      overview: {
        total_checkins: checkins.length,
        weeks_analyzed: weeklyTrends.length
      },
      weekly_trends: weeklyTrends,
      emotion_frequency: topEmotions,
      risk_distribution: riskDistribution,
      checkin_frequency_by_day: checkinFrequency
    });
  } catch (error) {
    console.error('Get shared trends error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch trend data'
    });
  }
};

/**
 * GET /shared/:patientId/export
 * Generates exportable data (JSON format)
 */
const exportSharedData = async (req, res) => {
  try {
    const connection = req.careCircleConnection;
    const patientUserId = connection.patient_user_id;
    const trustedUserId = req.user.dbId;
    const sharingTier = connection.sharing_tier;

    const { start_date, end_date, format = 'json' } = req.query;
    const { start, end } = parseDateRange(start_date, end_date, 90);

    // Validate format
    if (format !== 'json') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Currently only JSON format is supported. PDF export coming soon.'
      });
    }

    // Fetch all check-ins in date range
    const checkins = await CheckinResponse.find({
      user_id: patientUserId,
      created_at: { $gte: start, $lte: end }
    }).sort({ created_at: -1 }).lean();

    // Fetch mood entries
    const moodEntries = await MoodEntry.findAll({
      where: {
        user_id: patientUserId,
        created_at: { [Op.between]: [start, end] }
      },
      order: [['created_at', 'DESC']]
    });

    // Format check-ins based on tier
    const formattedCheckins = checkins.map(checkin => {
      const baseData = {
        id: checkin._id.toString(),
        date: checkin.created_at,
        mood_rating: checkin.mood_rating,
        mood_score: moodRatingToScore(checkin.mood_rating),
        stress_level: checkin.stress_level,
        emotions: checkin.selected_emotions || [],
        risk_level: checkin.ai_analysis?.risk_level || 'low',
        sentiment: checkin.ai_analysis?.sentiment || null
      };

      if (sharingTier === 'full') {
        return {
          ...baseData,
          checkin_text: checkin.check_in_text || null,
          ai_analysis: checkin.ai_analysis || null
        };
      }

      return baseData;
    });

    // Format mood entries
    const formattedMoods = moodEntries.map(entry => ({
      id: entry.id,
      date: entry.check_in_date,
      sentiment_score: entry.sentiment_score,
      sentiment_label: entry.sentiment_label,
      created_at: entry.created_at
    }));

    // Calculate summary statistics
    const allMoodScores = checkins.map(c => moodRatingToScore(c.mood_rating));
    const allStressLevels = checkins.map(c => c.stress_level);

    const summary = {
      total_checkins: checkins.length,
      total_mood_entries: moodEntries.length,
      average_mood_score: allMoodScores.length > 0
        ? (allMoodScores.reduce((a, b) => a + b, 0) / allMoodScores.length).toFixed(2)
        : null,
      average_stress_level: allStressLevels.length > 0
        ? (allStressLevels.reduce((a, b) => a + b, 0) / allStressLevels.length).toFixed(1)
        : null
    };

    // Get patient name
    const patientName = await getPatientDisplayName(patientUserId);

    // Log audit action
    await logAuditAction({
      connectionId: connection.id,
      actorUserId: trustedUserId,
      actionType: 'exported_data',
      details: {
        format,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        checkin_count: checkins.length,
        mood_count: moodEntries.length,
        sharing_tier: sharingTier
      },
      req
    });

    // Set headers for download
    const filename = `soulbloom_${patientName.toLowerCase().replace(/\s+/g, '_')}_${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.json({
      export_info: {
        patient_name: patientName,
        exported_by: req.user.email,
        export_date: new Date().toISOString(),
        sharing_tier: sharingTier,
        date_range: {
          start: start.toISOString(),
          end: end.toISOString()
        }
      },
      summary,
      checkins: formattedCheckins,
      mood_entries: formattedMoods,
      sharing_tier_note: sharingTier === 'data_only'
        ? 'Check-in text content excluded based on sharing preferences'
        : 'Full data access - includes check-in text content'
    });
  } catch (error) {
    console.error('Export shared data error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to export data'
    });
  }
};

module.exports = {
  getSharedSummary,
  getSharedMoods,
  getSharedCheckins,
  getSharedTrends,
  exportSharedData
};
