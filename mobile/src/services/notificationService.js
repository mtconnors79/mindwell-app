import notifee, {
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
  AuthorizationStatus,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDERS_STORAGE_KEY = '@soulbloom_reminders';
const DAILY_REMINDER_KEY = '@soulbloom_daily_reminder';
const MULTI_CHECKIN_KEY = '@soulbloom_multi_checkin';

// Default times for each time bucket
const TIME_BUCKET_DEFAULTS = {
  morning: '08:00',
  afternoon: '13:00',
  evening: '19:00',
};

// Gentle message templates
const CHECK_IN_MESSAGES = [
  'How are you feeling? Take a moment to check in.',
  'A quick check-in can make a big difference. How are you today?',
  'Take a moment to reflect. How are you doing right now?',
  'Your daily check-in is waiting. How are you feeling?',
];

const MINDFULNESS_MESSAGES = [
  'Time for a mindful moment. Try a breathing exercise.',
  'Take a breath. A few minutes of mindfulness can help.',
  'Ready for some calm? Try a quick mindfulness activity.',
  'A mindful pause awaits. Take a moment for yourself.',
];

const COMBINED_MESSAGES = [
  'Time for your daily wellness check. How are you feeling?',
  'Take a moment for yourself. Check in or try a mindful activity.',
  'Your wellness reminder: How are you doing today?',
];

// Time-of-day specific messages for multi-checkin
const TIME_BUCKET_MESSAGES = {
  morning: [
    'Good morning! How are you starting your day?',
    'Rise and shine! Take a moment to check in.',
    'Morning check-in: How are you feeling today?',
  ],
  afternoon: [
    'Afternoon check-in: How\'s your day going?',
    'Midday moment: Take a breath and check in.',
    'How are you feeling this afternoon?',
  ],
  evening: [
    'Evening reflection: How was your day?',
    'Time to wind down. How are you feeling tonight?',
    'End of day check-in: Take a moment to reflect.',
  ],
};

// Get random message for time bucket
const getTimeBucketMessage = (bucket) => {
  const messages = TIME_BUCKET_MESSAGES[bucket] || CHECK_IN_MESSAGES;
  return messages[Math.floor(Math.random() * messages.length)];
};

// Get random message based on type
const getRandomMessage = (type) => {
  let messages;
  switch (type) {
    case 'checkin':
      messages = CHECK_IN_MESSAGES;
      break;
    case 'mindfulness':
      messages = MINDFULNESS_MESSAGES;
      break;
    default:
      messages = COMBINED_MESSAGES;
  }
  return messages[Math.floor(Math.random() * messages.length)];
};

// Request notification permissions
export const requestNotificationPermission = async () => {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

// Check if notifications are enabled
export const checkNotificationPermission = async () => {
  const settings = await notifee.getNotificationSettings();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
};

// Create notification channel for Android
const createNotificationChannel = async () => {
  await notifee.createChannel({
    id: 'reminders',
    name: 'Daily Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
  });
};

// Schedule a single notification
export const scheduleNotification = async (reminder) => {
  await createNotificationChannel();

  const { id, time, type, frequency, days } = reminder;
  const [hours, minutes] = time.split(':').map(Number);

  // Calculate next trigger time
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  // Adjust for day-specific reminders
  if (frequency === 'weekdays') {
    while (triggerDate.getDay() === 0 || triggerDate.getDay() === 6) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
  } else if (frequency === 'weekends') {
    while (triggerDate.getDay() !== 0 && triggerDate.getDay() !== 6) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
  } else if (frequency === 'custom' && days && days.length > 0) {
    while (!days.includes(triggerDate.getDay())) {
      triggerDate.setDate(triggerDate.getDate() + 1);
    }
  }

  const message = getRandomMessage(type);

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: frequency === 'daily' ? RepeatFrequency.DAILY : RepeatFrequency.WEEKLY,
  };

  await notifee.createTriggerNotification(
    {
      id: `reminder_${id}`,
      title: 'SoulBloom Reminder',
      body: message,
      android: {
        channelId: 'reminders',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    },
    trigger
  );

  return triggerDate;
};

// Cancel a notification
export const cancelNotification = async (reminderId) => {
  await notifee.cancelNotification(`reminder_${reminderId}`);
};

// Cancel all notifications
export const cancelAllNotifications = async () => {
  await notifee.cancelAllNotifications();
};

// Save reminders to AsyncStorage
export const saveReminders = async (reminders) => {
  try {
    await AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Error saving reminders:', error);
  }
};

// Load reminders from AsyncStorage
export const loadReminders = async () => {
  try {
    const data = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading reminders:', error);
    return [];
  }
};

// Save daily reminder settings
export const saveDailyReminder = async (settings) => {
  try {
    await AsyncStorage.setItem(DAILY_REMINDER_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving daily reminder:', error);
  }
};

// Load daily reminder settings
export const loadDailyReminder = async () => {
  try {
    const data = await AsyncStorage.getItem(DAILY_REMINDER_KEY);
    return data ? JSON.parse(data) : { enabled: false, time: '09:00' };
  } catch (error) {
    console.error('Error loading daily reminder:', error);
    return { enabled: false, time: '09:00' };
  }
};

// Schedule daily reminder
export const scheduleDailyReminder = async (time) => {
  await createNotificationChannel();

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: 'daily_reminder',
      title: 'SoulBloom',
      body: 'How are you feeling? Take a moment to check in.',
      android: {
        channelId: 'reminders',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    },
    trigger
  );
};

// Cancel daily reminder
export const cancelDailyReminder = async () => {
  await notifee.cancelNotification('daily_reminder');
};

// Reschedule all enabled reminders
export const rescheduleAllReminders = async () => {
  // Cancel all existing
  await cancelAllNotifications();

  // Reschedule daily reminder if enabled
  const dailyReminder = await loadDailyReminder();
  if (dailyReminder.enabled) {
    await scheduleDailyReminder(dailyReminder.time);
  }

  // Reschedule custom reminders
  const reminders = await loadReminders();
  for (const reminder of reminders) {
    if (reminder.enabled) {
      await scheduleNotification(reminder);
    }
  }
};

// Generate unique ID for reminders
export const generateReminderId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ==========================================
// MULTI-CHECKIN REMINDER FUNCTIONS
// ==========================================

/**
 * Default multi-checkin settings
 */
const DEFAULT_MULTI_CHECKIN_SETTINGS = {
  enabled: false,
  frequency: 2, // 2x or 3x per day
  timeBuckets: {
    morning: { enabled: true, time: '08:00' },
    afternoon: { enabled: true, time: '13:00' },
    evening: { enabled: false, time: '19:00' },
  },
};

/**
 * Save multi-checkin settings
 */
export const saveMultiCheckinSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(MULTI_CHECKIN_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving multi-checkin settings:', error);
  }
};

/**
 * Load multi-checkin settings
 */
export const loadMultiCheckinSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(MULTI_CHECKIN_KEY);
    return data ? JSON.parse(data) : DEFAULT_MULTI_CHECKIN_SETTINGS;
  } catch (error) {
    console.error('Error loading multi-checkin settings:', error);
    return DEFAULT_MULTI_CHECKIN_SETTINGS;
  }
};

/**
 * Schedule a single time bucket reminder
 */
const scheduleTimeBucketReminder = async (bucket, time) => {
  await createNotificationChannel();

  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const triggerDate = new Date();
  triggerDate.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (triggerDate <= now) {
    triggerDate.setDate(triggerDate.getDate() + 1);
  }

  const trigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: triggerDate.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: `multi_checkin_${bucket}`,
      title: 'SoulBloom',
      body: getTimeBucketMessage(bucket),
      android: {
        channelId: 'reminders',
        smallIcon: 'ic_launcher',
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        sound: 'default',
      },
    },
    trigger
  );

  return triggerDate;
};

/**
 * Cancel a single time bucket reminder
 */
const cancelTimeBucketReminder = async (bucket) => {
  await notifee.cancelNotification(`multi_checkin_${bucket}`);
};

/**
 * Schedule all enabled multi-checkin reminders based on settings
 */
export const scheduleMultiCheckinReminders = async (settings) => {
  const { enabled, timeBuckets } = settings;

  // Cancel all existing multi-checkin reminders first
  await cancelTimeBucketReminder('morning');
  await cancelTimeBucketReminder('afternoon');
  await cancelTimeBucketReminder('evening');

  if (!enabled) {
    return;
  }

  // Schedule enabled time buckets
  const buckets = ['morning', 'afternoon', 'evening'];
  for (const bucket of buckets) {
    if (timeBuckets[bucket]?.enabled) {
      await scheduleTimeBucketReminder(bucket, timeBuckets[bucket].time);
    }
  }
};

/**
 * Cancel all multi-checkin reminders
 */
export const cancelMultiCheckinReminders = async () => {
  await cancelTimeBucketReminder('morning');
  await cancelTimeBucketReminder('afternoon');
  await cancelTimeBucketReminder('evening');
};

/**
 * Update a single time bucket setting and reschedule if needed
 */
export const updateTimeBucketSetting = async (bucket, enabled, time) => {
  const settings = await loadMultiCheckinSettings();

  settings.timeBuckets[bucket] = { enabled, time };
  await saveMultiCheckinSettings(settings);

  if (settings.enabled) {
    if (enabled) {
      await scheduleTimeBucketReminder(bucket, time);
    } else {
      await cancelTimeBucketReminder(bucket);
    }
  }

  return settings;
};

/**
 * Get default time for a bucket
 */
export const getDefaultBucketTime = (bucket) => {
  return TIME_BUCKET_DEFAULTS[bucket] || '12:00';
};
