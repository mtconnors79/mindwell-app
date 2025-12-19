import { format, subDays, parseISO } from 'date-fns';

/**
 * Convert mood score (-1 to 1) to human-readable label
 */
export const getMoodLabel = (score) => {
  if (score === null || score === undefined) return 'N/A';
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return 'N/A';

  if (numScore >= 0.7) return 'Excellent';
  if (numScore >= 0.4) return 'Good';
  if (numScore >= 0.1) return 'Okay';
  if (numScore >= -0.2) return 'Low';
  if (numScore >= -0.5) return 'Struggling';
  return 'Very Low';
};

/**
 * Get mood color based on score
 */
export const getMoodColor = (score) => {
  if (score === null || score === undefined) return '#8FA4B3';
  const numScore = parseFloat(score);
  if (isNaN(numScore)) return '#8FA4B3';

  if (numScore >= 0.4) return '#22C55E'; // green
  if (numScore >= 0) return '#355F5B'; // primary
  if (numScore >= -0.3) return '#F59E0B'; // yellow/warning
  return '#EF4444'; // red
};

/**
 * Convert stress level (1-10) to human-readable label
 */
export const getStressLabel = (level) => {
  if (level === null || level === undefined) return 'N/A';
  const numLevel = parseInt(level);
  if (isNaN(numLevel)) return 'N/A';

  if (numLevel <= 2) return 'Very Low';
  if (numLevel <= 4) return 'Low';
  if (numLevel <= 6) return 'Moderate';
  if (numLevel <= 8) return 'High';
  return 'Very High';
};

/**
 * Get stress color based on level
 */
export const getStressColor = (level) => {
  if (level === null || level === undefined) return '#8FA4B3';
  const numLevel = parseInt(level);
  if (isNaN(numLevel)) return '#8FA4B3';

  if (numLevel <= 3) return '#22C55E'; // green
  if (numLevel <= 5) return '#355F5B'; // primary
  if (numLevel <= 7) return '#F59E0B'; // yellow/warning
  return '#EF4444'; // red
};

/**
 * Format date range for display
 */
export const formatDateRange = (startDate, endDate) => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
};

/**
 * Get date range based on period string
 */
export const getDateRangeFromPeriod = (period) => {
  const endDate = new Date();
  let startDate;

  switch (period) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    default:
      startDate = subDays(endDate, 30);
  }

  return { startDate, endDate };
};

/**
 * Generate filename for report export
 */
export const generateReportFilename = (patientName, startDate, endDate, extension = 'pdf') => {
  const sanitizedName = patientName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  return `soulbloom_wellness_report_${sanitizedName}_${startStr}_to_${endStr}.${extension}`;
};

/**
 * Format mood rating enum to display text
 */
export const formatMoodRating = (rating) => {
  const moodMap = {
    great: 'Great',
    good: 'Good',
    okay: 'Okay',
    not_good: 'Not Good',
    terrible: 'Terrible',
  };
  return moodMap[rating] || rating || 'N/A';
};

/**
 * Get emoji for mood rating
 */
export const getMoodEmoji = (rating) => {
  const emojiMap = {
    great: '😊',
    good: '🙂',
    okay: '😐',
    not_good: '😔',
    terrible: '😢',
  };
  return emojiMap[rating] || '❓';
};

/**
 * Format emotions array for display
 */
export const formatEmotions = (emotions) => {
  if (!emotions || !Array.isArray(emotions) || emotions.length === 0) {
    return 'None recorded';
  }
  return emotions.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
};

/**
 * Calculate summary statistics from check-ins
 */
export const calculateSummaryStats = (checkins) => {
  if (!checkins || checkins.length === 0) {
    return {
      totalCheckins: 0,
      averageMood: null,
      averageStress: null,
      mostCommonEmotions: [],
    };
  }

  const moodScores = {
    great: 1,
    good: 0.5,
    okay: 0,
    not_good: -0.5,
    terrible: -1,
  };

  let totalMood = 0;
  let moodCount = 0;
  let totalStress = 0;
  let stressCount = 0;
  const emotionCounts = {};

  checkins.forEach((checkin) => {
    // Mood
    if (checkin.mood_rating && moodScores[checkin.mood_rating] !== undefined) {
      totalMood += moodScores[checkin.mood_rating];
      moodCount++;
    }

    // Stress
    if (checkin.stress_level !== null && checkin.stress_level !== undefined) {
      totalStress += checkin.stress_level;
      stressCount++;
    }

    // Emotions
    if (checkin.emotions && Array.isArray(checkin.emotions)) {
      checkin.emotions.forEach((emotion) => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    }
  });

  const mostCommonEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([emotion, count]) => ({ emotion, count }));

  return {
    totalCheckins: checkins.length,
    averageMood: moodCount > 0 ? (totalMood / moodCount).toFixed(2) : null,
    averageStress: stressCount > 0 ? (totalStress / stressCount).toFixed(1) : null,
    mostCommonEmotions,
  };
};

/**
 * Format date for report display
 */
export const formatReportDate = (date) => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
};

/**
 * Format date for table display (shorter)
 */
export const formatTableDate = (date) => {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, h:mm a');
};
