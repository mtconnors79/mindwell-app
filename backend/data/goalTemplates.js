const goalTemplates = [
  {
    id: 'daily-checkin',
    title: 'Daily Check-in',
    activity_type: 'check_in',
    target_count: 1,
    time_frame: 'daily',
    description: 'Build a daily reflection habit',
    category: 'beginner'
  },
  {
    id: 'weekly-mindfulness',
    title: 'Weekly Mindfulness',
    activity_type: 'mindfulness',
    target_count: 5,
    time_frame: 'weekly',
    description: 'Practice mindfulness 5x per week',
    category: 'wellness'
  },
  {
    id: 'breathing-break',
    title: 'Breathing Break',
    activity_type: 'breathing',
    target_count: 1,
    time_frame: 'daily',
    description: 'Take one breathing break daily',
    category: 'beginner'
  },
  {
    id: 'mood-awareness',
    title: 'Mood Awareness',
    activity_type: 'quick_mood',
    target_count: 3,
    time_frame: 'daily',
    description: 'Log your mood 3x daily',
    category: 'awareness'
  },
  {
    id: 'journaling-journey',
    title: 'Journaling Journey',
    activity_type: 'journaling',
    target_count: 3,
    time_frame: 'weekly',
    description: 'Write meaningful entries 3x per week',
    category: 'reflection'
  },
  {
    id: 'monthly-meditation',
    title: 'Monthly Meditation Master',
    activity_type: 'mindfulness',
    target_count: 20,
    time_frame: 'monthly',
    description: 'Complete 20 mindfulness activities this month',
    category: 'challenge'
  },
  {
    id: 'consistency-champion',
    title: 'Consistency Champion',
    activity_type: 'check_in',
    target_count: 7,
    time_frame: 'weekly',
    description: 'Check in every day this week',
    category: 'challenge'
  }
];

/**
 * Get all goal templates
 * @returns {Array} All goal templates
 */
const getAllTemplates = () => goalTemplates;

/**
 * Get a goal template by ID
 * @param {string} templateId
 * @returns {Object|null} The template or null if not found
 */
const getTemplateById = (templateId) => {
  return goalTemplates.find(t => t.id === templateId) || null;
};

/**
 * Get templates by category
 * @param {string} category
 * @returns {Array} Templates in the category
 */
const getTemplatesByCategory = (category) => {
  return goalTemplates.filter(t => t.category === category);
};

/**
 * Get templates by activity type
 * @param {string} activityType
 * @returns {Array} Templates with the activity type
 */
const getTemplatesByActivityType = (activityType) => {
  return goalTemplates.filter(t => t.activity_type === activityType);
};

module.exports = {
  goalTemplates,
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByActivityType
};
