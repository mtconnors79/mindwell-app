const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticateAndLoadUser } = require('../middleware/auth');
const { ActivityCompletion } = require('../models');

// Hardcoded mindfulness activities
const MINDFULNESS_ACTIVITIES = {
  breathing: [
    {
      id: 'breathing-4-7-8',
      name: '4-7-8 Breathing',
      description: 'A calming technique: breathe in for 4 seconds, hold for 7, exhale for 8.',
      duration_seconds: 180,
      type: 'builtin',
      category: 'breathing',
      instructions: {
        inhale: 4,
        hold: 7,
        exhale: 8,
        cycles: 4
      }
    },
    {
      id: 'breathing-box',
      name: 'Box Breathing',
      description: 'Equal parts inhale, hold, exhale, hold. Used by Navy SEALs for stress relief.',
      duration_seconds: 240,
      type: 'builtin',
      category: 'breathing',
      instructions: {
        inhale: 4,
        hold: 4,
        exhale: 4,
        holdAfterExhale: 4,
        cycles: 4
      }
    },
    {
      id: 'breathing-calm',
      name: 'Calming Breath',
      description: 'Simple deep breathing to activate your parasympathetic nervous system.',
      duration_seconds: 120,
      type: 'builtin',
      category: 'breathing',
      instructions: {
        inhale: 4,
        hold: 2,
        exhale: 6,
        cycles: 5
      }
    }
  ],
  grounding: [
    {
      id: 'grounding-5-4-3-2-1',
      name: '5-4-3-2-1 Technique',
      description: 'Notice 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste.',
      duration_seconds: 300,
      type: 'builtin',
      category: 'grounding',
      steps: [
        'Look around and name 5 things you can see',
        'Touch 4 different objects and notice their texture',
        'Listen for 3 distinct sounds around you',
        'Identify 2 things you can smell',
        'Notice 1 thing you can taste'
      ]
    },
    {
      id: 'grounding-body-scan',
      name: 'Quick Body Scan',
      description: 'Bring awareness to each part of your body from head to toe.',
      duration_seconds: 180,
      type: 'builtin',
      category: 'grounding',
      steps: [
        'Close your eyes and take a deep breath',
        'Notice any tension in your head and face',
        'Relax your shoulders and arms',
        'Feel your chest rise and fall',
        'Release tension in your legs and feet'
      ]
    }
  ],
  quick_resets: [
    {
      id: 'reset-mindful-minute',
      name: 'Mindful Minute',
      description: 'One minute of focused attention on your breath.',
      duration_seconds: 60,
      type: 'builtin',
      category: 'quick_resets',
      instructions: {
        inhale: 4,
        exhale: 4,
        cycles: 6
      }
    },
    {
      id: 'reset-shoulders',
      name: 'Shoulder Release',
      description: 'Quick tension release for your shoulders and neck.',
      duration_seconds: 45,
      type: 'builtin',
      category: 'quick_resets',
      steps: [
        'Raise your shoulders to your ears',
        'Hold for 3 seconds',
        'Release and let them drop',
        'Repeat 3 times'
      ]
    }
  ],
  guided_meditations: [
    {
      id: 'guided-ucla-breathing',
      name: 'UCLA Breathing Meditation',
      description: '5-minute guided breathing meditation from UCLA Mindful Awareness Research Center.',
      duration_seconds: 300,
      type: 'external',
      category: 'guided_meditations',
      url: 'https://www.uclahealth.org/marc/mindful-meditations'
    },
    {
      id: 'guided-youtube-anxiety',
      name: '10-Min Anxiety Relief',
      description: 'Guided meditation for anxiety and stress relief.',
      duration_seconds: 600,
      type: 'external',
      category: 'guided_meditations',
      url: 'https://www.youtube.com/watch?v=O-6f5wQXSu8'
    },
    {
      id: 'guided-headspace-basics',
      name: 'Meditation Basics',
      description: 'Introduction to meditation fundamentals.',
      duration_seconds: 600,
      type: 'external',
      category: 'guided_meditations',
      url: 'https://www.youtube.com/watch?v=ZToicYcHIOU'
    }
  ],
  sleep: [
    {
      id: 'sleep-body-scan',
      name: 'Sleep Body Scan',
      description: 'Relaxing body scan meditation to help you fall asleep.',
      duration_seconds: 900,
      type: 'external',
      category: 'sleep',
      url: 'https://www.youtube.com/watch?v=1vx8iUvfyCY'
    },
    {
      id: 'sleep-rain-sounds',
      name: 'Rain Sounds for Sleep',
      description: 'Calming rain sounds to help you drift off.',
      duration_seconds: 3600,
      type: 'external',
      category: 'sleep',
      url: 'https://www.youtube.com/watch?v=mPZkdNFkNps'
    },
    {
      id: 'sleep-ucla-relaxation',
      name: 'UCLA Deep Relaxation',
      description: 'Guided relaxation for better sleep from UCLA MARC.',
      duration_seconds: 780,
      type: 'external',
      category: 'sleep',
      url: 'https://www.uclahealth.org/marc/mindful-meditations'
    }
  ]
};

// Category metadata
const CATEGORY_INFO = {
  breathing: {
    name: 'Breathing Exercises',
    description: 'Controlled breathing techniques to calm your mind',
    icon: 'leaf'
  },
  grounding: {
    name: 'Grounding Techniques',
    description: 'Exercises to bring you back to the present moment',
    icon: 'earth'
  },
  quick_resets: {
    name: 'Quick Resets',
    description: 'Short exercises when you need a quick break',
    icon: 'flash'
  },
  guided_meditations: {
    name: 'Guided Meditations',
    description: 'Longer guided sessions for deeper practice',
    icon: 'headset'
  },
  sleep: {
    name: 'Sleep & Relaxation',
    description: 'Activities to help you wind down and sleep better',
    icon: 'moon'
  }
};

// GET /api/activities/mindfulness - Get all mindfulness activities
router.get('/', (req, res) => {
  try {
    const allActivities = [];
    const categories = [];

    for (const [categoryKey, activities] of Object.entries(MINDFULNESS_ACTIVITIES)) {
      categories.push({
        id: categoryKey,
        ...CATEGORY_INFO[categoryKey],
        activityCount: activities.length
      });

      activities.forEach(activity => {
        allActivities.push(activity);
      });
    }

    res.json({
      success: true,
      categories,
      activities: MINDFULNESS_ACTIVITIES,
      allActivities
    });
  } catch (error) {
    console.error('Get mindfulness activities error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mindfulness activities'
    });
  }
});

// GET /api/activities/mindfulness/:activityId - Get a specific activity
router.get('/:activityId', (req, res) => {
  try {
    const { activityId } = req.params;

    for (const activities of Object.values(MINDFULNESS_ACTIVITIES)) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        return res.json({
          success: true,
          activity
        });
      }
    }

    res.status(404).json({
      error: 'Not Found',
      message: 'Activity not found'
    });
  } catch (error) {
    console.error('Get activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch activity'
    });
  }
});

// All routes below require authentication
router.use(authenticateAndLoadUser);

// POST /api/activities/mindfulness/:activityId/complete - Log activity completion
router.post('/:activityId/complete', async (req, res) => {
  try {
    const { activityId } = req.params;
    const user_id = req.user.dbId;

    // Verify activity exists
    let foundActivity = null;
    for (const activities of Object.values(MINDFULNESS_ACTIVITIES)) {
      const activity = activities.find(a => a.id === activityId);
      if (activity) {
        foundActivity = activity;
        break;
      }
    }

    if (!foundActivity) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Activity not found'
      });
    }

    // Log the completion
    const completion = await ActivityCompletion.create({
      user_id,
      activity_id: activityId,
      completed_at: new Date()
    });

    // Get updated stats
    const stats = await getStreakStats(user_id);

    res.status(201).json({
      success: true,
      message: 'Activity completed!',
      completion: {
        id: completion.id,
        activity_id: completion.activity_id,
        completed_at: completion.completed_at
      },
      activity: foundActivity,
      stats
    });
  } catch (error) {
    console.error('Complete activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to log activity completion'
    });
  }
});

// GET /api/activities/mindfulness/stats/user - Get user's completion stats
router.get('/stats/user', async (req, res) => {
  try {
    const user_id = req.user.dbId;
    const stats = await getStreakStats(user_id);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get mindfulness stats error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch mindfulness statistics'
    });
  }
});

// Helper function to calculate streak and stats
async function getStreakStats(user_id) {
  // Get total completions
  const totalCompletions = await ActivityCompletion.count({
    where: { user_id }
  });

  // Get completions by activity for frequency
  const { sequelize } = require('../config/sequelize');
  const completionsByActivity = await ActivityCompletion.findAll({
    where: { user_id },
    attributes: [
      'activity_id',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['activity_id'],
    order: [[sequelize.literal('count'), 'DESC']],
    limit: 5
  });

  // Calculate current streak
  const completionDates = await ActivityCompletion.findAll({
    where: { user_id },
    attributes: [
      [sequelize.fn('DATE', sequelize.col('completed_at')), 'date']
    ],
    group: [sequelize.fn('DATE', sequelize.col('completed_at'))],
    order: [[sequelize.fn('DATE', sequelize.col('completed_at')), 'DESC']]
  });

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < completionDates.length; i++) {
    const completionDate = new Date(completionDates[i].get('date'));
    completionDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(expectedDate.getDate() - i);
    expectedDate.setHours(0, 0, 0, 0);

    // Allow streak to start from today or yesterday
    if (i === 0) {
      const dayDiff = Math.floor((today - completionDate) / (1000 * 60 * 60 * 24));
      if (dayDiff > 1) {
        break; // Streak is broken
      }
      currentStreak = 1;
    } else if (completionDate.getTime() === expectedDate.getTime()) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Get completions this week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyCompletions = await ActivityCompletion.count({
    where: {
      user_id,
      completed_at: {
        [Op.gte]: startOfWeek
      }
    }
  });

  return {
    totalCompletions,
    currentStreak,
    weeklyCompletions,
    topActivities: completionsByActivity.map(c => ({
      activity_id: c.activity_id,
      count: parseInt(c.get('count'))
    }))
  };
}

// GET /api/activities/mindfulness/suggested - Get suggested activity based on mood
router.get('/suggested/activity', async (req, res) => {
  try {
    const { mood } = req.query;

    let suggestedCategory = 'breathing';
    let reason = 'A breathing exercise can help center you.';

    if (mood === 'terrible' || mood === 'not_good') {
      suggestedCategory = 'breathing';
      reason = 'Breathing exercises can help calm anxiety and stress.';
    } else if (mood === 'okay') {
      suggestedCategory = 'grounding';
      reason = 'Grounding techniques can help you feel more present.';
    } else if (mood === 'good' || mood === 'great') {
      // Pick a random category for positive moods
      const positiveCategories = ['breathing', 'grounding', 'quick_resets', 'guided_meditations'];
      suggestedCategory = positiveCategories[Math.floor(Math.random() * positiveCategories.length)];
      reason = 'Keep up the good energy with a mindfulness practice!';
    }

    const activities = MINDFULNESS_ACTIVITIES[suggestedCategory];
    const suggestedActivity = activities[Math.floor(Math.random() * activities.length)];

    res.json({
      success: true,
      suggestion: {
        activity: suggestedActivity,
        category: CATEGORY_INFO[suggestedCategory],
        reason
      }
    });
  } catch (error) {
    console.error('Get suggested activity error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get suggested activity'
    });
  }
});

module.exports = router;
