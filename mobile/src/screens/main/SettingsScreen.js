import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AddReminderModal from '../../components/AddReminderModal';
import { colors } from '../../theme/colors';
import {
  requestNotificationPermission,
  checkNotificationPermission,
  loadDailyReminder,
  saveDailyReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  loadReminders,
  saveReminders,
  scheduleNotification,
  cancelNotification,
  generateReminderId,
  loadMultiCheckinSettings,
  saveMultiCheckinSettings,
  scheduleMultiCheckinReminders,
  cancelMultiCheckinReminders,
} from '../../services/notificationService';

const RESOURCE_SUGGESTIONS_KEY = '@soulbloom_resource_suggestions';

const SettingsScreen = ({ navigation }) => {
  // Daily Reminder State
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState(new Date());
  const [showDailyTimePicker, setShowDailyTimePicker] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  // Custom Reminders State
  const [reminders, setReminders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);

  // Preferences State
  const [resourceSuggestionsEnabled, setResourceSuggestionsEnabled] = useState(true);

  // Multi-Checkin State
  const [multiCheckinEnabled, setMultiCheckinEnabled] = useState(false);
  const [multiCheckinFrequency, setMultiCheckinFrequency] = useState(2);
  const [timeBuckets, setTimeBuckets] = useState({
    morning: { enabled: true, time: '08:00' },
    afternoon: { enabled: true, time: '13:00' },
    evening: { enabled: false, time: '19:00' },
  });
  const [showBucketTimePicker, setShowBucketTimePicker] = useState(null); // 'morning' | 'afternoon' | 'evening' | null

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    // Check notification permission
    const permitted = await checkNotificationPermission();
    setHasPermission(permitted);

    // Load daily reminder settings
    const dailySettings = await loadDailyReminder();
    setDailyReminderEnabled(dailySettings.enabled);

    const [hours, minutes] = dailySettings.time.split(':').map(Number);
    const time = new Date();
    time.setHours(hours, minutes, 0, 0);
    setDailyReminderTime(time);

    // Load custom reminders
    const savedReminders = await loadReminders();
    setReminders(savedReminders);

    // Load resource suggestions preference
    try {
      const resourcePref = await AsyncStorage.getItem(RESOURCE_SUGGESTIONS_KEY);
      if (resourcePref !== null) {
        setResourceSuggestionsEnabled(resourcePref === 'true');
      }
    } catch (error) {
      console.log('Error loading resource preference:', error);
    }

    // Load multi-checkin settings
    const multiSettings = await loadMultiCheckinSettings();
    setMultiCheckinEnabled(multiSettings.enabled);
    setMultiCheckinFrequency(multiSettings.frequency);
    setTimeBuckets(multiSettings.timeBuckets);
  };

  const handleResourceSuggestionsToggle = async (value) => {
    setResourceSuggestionsEnabled(value);
    try {
      await AsyncStorage.setItem(RESOURCE_SUGGESTIONS_KEY, value.toString());
    } catch (error) {
      console.log('Error saving resource preference:', error);
    }
  };

  const handleDailyReminderToggle = async (value) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      setHasPermission(true);
    }

    setDailyReminderEnabled(value);

    const timeStr = formatTimeForStorage(dailyReminderTime);
    await saveDailyReminder({ enabled: value, time: timeStr });

    if (value) {
      await scheduleDailyReminder(timeStr);
    } else {
      await cancelDailyReminder();
    }
  };

  const handleDailyTimeChange = async (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowDailyTimePicker(false);
    }

    if (selectedTime) {
      setDailyReminderTime(selectedTime);

      const timeStr = formatTimeForStorage(selectedTime);
      await saveDailyReminder({ enabled: dailyReminderEnabled, time: timeStr });

      if (dailyReminderEnabled) {
        await cancelDailyReminder();
        await scheduleDailyReminder(timeStr);
      }
    }
  };

  const formatTimeForStorage = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatTimeDisplay = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatTimeStringDisplay = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return formatTimeDisplay(date);
  };

  // Multi-Checkin Handlers
  const handleMultiCheckinToggle = async (value) => {
    if (value && !hasPermission) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in Settings to receive reminders.',
          [{ text: 'OK' }]
        );
        return;
      }
      setHasPermission(true);
    }

    setMultiCheckinEnabled(value);

    const newSettings = {
      enabled: value,
      frequency: multiCheckinFrequency,
      timeBuckets,
    };

    await saveMultiCheckinSettings(newSettings);

    if (value) {
      await scheduleMultiCheckinReminders(newSettings);
    } else {
      await cancelMultiCheckinReminders();
    }
  };

  const handleFrequencyChange = async (newFrequency) => {
    setMultiCheckinFrequency(newFrequency);

    // Update enabled buckets based on frequency
    let updatedBuckets = { ...timeBuckets };
    if (newFrequency === 2) {
      // 2x per day: morning + evening (or keep current 2)
      const enabledCount = Object.values(updatedBuckets).filter(b => b.enabled).length;
      if (enabledCount > 2) {
        updatedBuckets.afternoon = { ...updatedBuckets.afternoon, enabled: false };
      }
    }

    setTimeBuckets(updatedBuckets);

    const newSettings = {
      enabled: multiCheckinEnabled,
      frequency: newFrequency,
      timeBuckets: updatedBuckets,
    };

    await saveMultiCheckinSettings(newSettings);

    if (multiCheckinEnabled) {
      await scheduleMultiCheckinReminders(newSettings);
    }
  };

  const handleTimeBucketToggle = async (bucket, enabled) => {
    // Enforce frequency limit
    const enabledCount = Object.values(timeBuckets).filter(b => b.enabled).length;

    if (enabled && enabledCount >= multiCheckinFrequency) {
      Alert.alert(
        'Limit Reached',
        `You can only enable ${multiCheckinFrequency} time slots with ${multiCheckinFrequency}x frequency. Disable another slot first or increase frequency.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!enabled && enabledCount <= 1) {
      Alert.alert(
        'Minimum Required',
        'At least one time slot must be enabled.',
        [{ text: 'OK' }]
      );
      return;
    }

    const updatedBuckets = {
      ...timeBuckets,
      [bucket]: { ...timeBuckets[bucket], enabled },
    };

    setTimeBuckets(updatedBuckets);

    const newSettings = {
      enabled: multiCheckinEnabled,
      frequency: multiCheckinFrequency,
      timeBuckets: updatedBuckets,
    };

    await saveMultiCheckinSettings(newSettings);

    if (multiCheckinEnabled) {
      await scheduleMultiCheckinReminders(newSettings);
    }
  };

  const handleBucketTimeChange = async (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowBucketTimePicker(null);
    }

    if (selectedTime && showBucketTimePicker) {
      const bucket = showBucketTimePicker;
      const timeStr = formatTimeForStorage(selectedTime);

      const updatedBuckets = {
        ...timeBuckets,
        [bucket]: { ...timeBuckets[bucket], time: timeStr },
      };

      setTimeBuckets(updatedBuckets);

      const newSettings = {
        enabled: multiCheckinEnabled,
        frequency: multiCheckinFrequency,
        timeBuckets: updatedBuckets,
      };

      await saveMultiCheckinSettings(newSettings);

      if (multiCheckinEnabled && timeBuckets[bucket].enabled) {
        await scheduleMultiCheckinReminders(newSettings);
      }
    }
  };

  const getBucketTimeAsDate = (bucket) => {
    const timeStr = timeBuckets[bucket]?.time || '12:00';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const handleAddReminder = () => {
    if (!hasPermission) {
      requestNotificationPermission().then((granted) => {
        if (granted) {
          setHasPermission(true);
          setEditingReminder(null);
          setShowAddModal(true);
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in Settings to add reminders.',
            [{ text: 'OK' }]
          );
        }
      });
      return;
    }
    setEditingReminder(null);
    setShowAddModal(true);
  };

  const handleEditReminder = (reminder) => {
    setEditingReminder(reminder);
    setShowAddModal(true);
  };

  const handleSaveReminder = async (reminderData) => {
    let updatedReminders;

    if (reminderData.id) {
      // Editing existing reminder
      updatedReminders = reminders.map((r) =>
        r.id === reminderData.id ? reminderData : r
      );
      await cancelNotification(reminderData.id);
    } else {
      // Adding new reminder
      reminderData.id = generateReminderId();
      updatedReminders = [...reminders, reminderData];
    }

    setReminders(updatedReminders);
    await saveReminders(updatedReminders);

    if (reminderData.enabled) {
      await scheduleNotification(reminderData);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelNotification(reminderId);
            const updatedReminders = reminders.filter((r) => r.id !== reminderId);
            setReminders(updatedReminders);
            await saveReminders(updatedReminders);
          },
        },
      ]
    );
  };

  const handleToggleReminder = async (reminder) => {
    const updatedReminder = { ...reminder, enabled: !reminder.enabled };
    const updatedReminders = reminders.map((r) =>
      r.id === reminder.id ? updatedReminder : r
    );

    setReminders(updatedReminders);
    await saveReminders(updatedReminders);

    if (updatedReminder.enabled) {
      await scheduleNotification(updatedReminder);
    } else {
      await cancelNotification(reminder.id);
    }
  };

  const getFrequencyLabel = (frequency, days) => {
    switch (frequency) {
      case 'daily':
        return 'Every day';
      case 'weekdays':
        return 'Weekdays';
      case 'weekends':
        return 'Weekends';
      case 'custom':
        if (days && days.length > 0) {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return days.map((d) => dayNames[d]).join(', ');
        }
        return 'Custom';
      default:
        return frequency;
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'checkin':
        return 'create-outline';
      case 'mindfulness':
        return 'leaf-outline';
      default:
        return 'heart-outline';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          {/* Daily Reminder */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="notifications-outline" size={22} color="#6366F1" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Daily Reminder</Text>
                  <Text style={styles.settingDescription}>
                    Get reminded to check in each day
                  </Text>
                </View>
              </View>
              <Switch
                value={dailyReminderEnabled}
                onValueChange={handleDailyReminderToggle}
                trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                thumbColor={dailyReminderEnabled ? '#6366F1' : '#9CA3AF'}
              />
            </View>

            {dailyReminderEnabled && (
              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => setShowDailyTimePicker(true)}
              >
                <Icon name="time-outline" size={20} color="#6366F1" />
                <Text style={styles.timeText}>{formatTimeDisplay(dailyReminderTime)}</Text>
                <Icon name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            {showDailyTimePicker && (
              <View style={styles.timePickerContainer}>
                <DateTimePicker
                  value={dailyReminderTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDailyTimeChange}
                  style={styles.timePicker}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => setShowDailyTimePicker(false)}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Custom Reminders */}
          <View style={styles.settingCard}>
            <View style={styles.customRemindersHeader}>
              <View style={styles.settingInfo}>
                <View style={styles.settingIconContainer}>
                  <Icon name="alarm-outline" size={22} color="#6366F1" />
                </View>
                <Text style={styles.settingLabel}>Custom Reminders</Text>
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddReminder}
              >
                <Icon name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {reminders.length === 0 ? (
              <Text style={styles.emptyText}>
                No custom reminders yet. Tap + to add one.
              </Text>
            ) : (
              <View style={styles.remindersList}>
                {reminders.map((reminder) => (
                  <View key={reminder.id} style={styles.reminderItem}>
                    <TouchableOpacity
                      style={styles.reminderContent}
                      onPress={() => handleEditReminder(reminder)}
                    >
                      <View style={styles.reminderIcon}>
                        <Icon
                          name={getTypeIcon(reminder.type)}
                          size={20}
                          color={reminder.enabled ? '#6366F1' : '#9CA3AF'}
                        />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={[
                          styles.reminderTime,
                          !reminder.enabled && styles.reminderDisabled,
                        ]}>
                          {reminder.time}
                        </Text>
                        <Text style={styles.reminderFrequency}>
                          {getFrequencyLabel(reminder.frequency, reminder.days)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.reminderActions}>
                      <Switch
                        value={reminder.enabled}
                        onValueChange={() => handleToggleReminder(reminder)}
                        trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                        thumbColor={reminder.enabled ? '#6366F1' : '#9CA3AF'}
                        style={styles.reminderSwitch}
                      />
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteReminder(reminder.id)}
                      >
                        <Icon name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Mood Check-in Reminders Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mood Check-in Reminders</Text>

          {/* Multi-Checkin Toggle */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="refresh-outline" size={22} color="#10B981" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Multiple Check-ins Per Day</Text>
                  <Text style={styles.settingDescription}>
                    Get prompted to check in at different times
                  </Text>
                </View>
              </View>
              <Switch
                value={multiCheckinEnabled}
                onValueChange={handleMultiCheckinToggle}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={multiCheckinEnabled ? '#10B981' : '#9CA3AF'}
              />
            </View>

            {/* Frequency Selector - shown when enabled */}
            {multiCheckinEnabled && (
              <>
                <View style={styles.frequencySection}>
                  <Text style={styles.frequencyLabel}>How often?</Text>
                  <View style={styles.frequencyButtons}>
                    <TouchableOpacity
                      style={[
                        styles.frequencyButton,
                        multiCheckinFrequency === 2 && styles.frequencyButtonActive,
                      ]}
                      onPress={() => handleFrequencyChange(2)}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          multiCheckinFrequency === 2 && styles.frequencyButtonTextActive,
                        ]}
                      >
                        2x per day
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.frequencyButton,
                        multiCheckinFrequency === 3 && styles.frequencyButtonActive,
                      ]}
                      onPress={() => handleFrequencyChange(3)}
                    >
                      <Text
                        style={[
                          styles.frequencyButtonText,
                          multiCheckinFrequency === 3 && styles.frequencyButtonTextActive,
                        ]}
                      >
                        3x per day
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Time Bucket Toggles */}
                <View style={styles.timeBucketsSection}>
                  <Text style={styles.timeBucketsLabel}>When to remind you:</Text>

                  {/* Morning */}
                  <View style={styles.timeBucketItem}>
                    <View style={styles.timeBucketInfo}>
                      <Icon name="sunny-outline" size={20} color="#F59E0B" />
                      <Text style={styles.timeBucketName}>Morning</Text>
                    </View>
                    <View style={styles.timeBucketControls}>
                      <TouchableOpacity
                        style={[
                          styles.timeBucketTime,
                          !timeBuckets.morning.enabled && styles.timeBucketTimeDisabled,
                        ]}
                        onPress={() => timeBuckets.morning.enabled && setShowBucketTimePicker('morning')}
                        disabled={!timeBuckets.morning.enabled}
                      >
                        <Text
                          style={[
                            styles.timeBucketTimeText,
                            !timeBuckets.morning.enabled && styles.timeBucketTimeTextDisabled,
                          ]}
                        >
                          {formatTimeStringDisplay(timeBuckets.morning.time)}
                        </Text>
                      </TouchableOpacity>
                      <Switch
                        value={timeBuckets.morning.enabled}
                        onValueChange={(value) => handleTimeBucketToggle('morning', value)}
                        trackColor={{ false: '#E5E7EB', true: '#FDE68A' }}
                        thumbColor={timeBuckets.morning.enabled ? '#F59E0B' : '#9CA3AF'}
                        style={styles.timeBucketSwitch}
                      />
                    </View>
                  </View>

                  {/* Afternoon */}
                  <View style={styles.timeBucketItem}>
                    <View style={styles.timeBucketInfo}>
                      <Icon name="partly-sunny-outline" size={20} color="#6366F1" />
                      <Text style={styles.timeBucketName}>Afternoon</Text>
                    </View>
                    <View style={styles.timeBucketControls}>
                      <TouchableOpacity
                        style={[
                          styles.timeBucketTime,
                          !timeBuckets.afternoon.enabled && styles.timeBucketTimeDisabled,
                        ]}
                        onPress={() => timeBuckets.afternoon.enabled && setShowBucketTimePicker('afternoon')}
                        disabled={!timeBuckets.afternoon.enabled}
                      >
                        <Text
                          style={[
                            styles.timeBucketTimeText,
                            !timeBuckets.afternoon.enabled && styles.timeBucketTimeTextDisabled,
                          ]}
                        >
                          {formatTimeStringDisplay(timeBuckets.afternoon.time)}
                        </Text>
                      </TouchableOpacity>
                      <Switch
                        value={timeBuckets.afternoon.enabled}
                        onValueChange={(value) => handleTimeBucketToggle('afternoon', value)}
                        trackColor={{ false: '#E5E7EB', true: '#C7D2FE' }}
                        thumbColor={timeBuckets.afternoon.enabled ? '#6366F1' : '#9CA3AF'}
                        style={styles.timeBucketSwitch}
                      />
                    </View>
                  </View>

                  {/* Evening */}
                  <View style={styles.timeBucketItem}>
                    <View style={styles.timeBucketInfo}>
                      <Icon name="moon-outline" size={20} color="#8B5CF6" />
                      <Text style={styles.timeBucketName}>Evening</Text>
                    </View>
                    <View style={styles.timeBucketControls}>
                      <TouchableOpacity
                        style={[
                          styles.timeBucketTime,
                          !timeBuckets.evening.enabled && styles.timeBucketTimeDisabled,
                        ]}
                        onPress={() => timeBuckets.evening.enabled && setShowBucketTimePicker('evening')}
                        disabled={!timeBuckets.evening.enabled}
                      >
                        <Text
                          style={[
                            styles.timeBucketTimeText,
                            !timeBuckets.evening.enabled && styles.timeBucketTimeTextDisabled,
                          ]}
                        >
                          {formatTimeStringDisplay(timeBuckets.evening.time)}
                        </Text>
                      </TouchableOpacity>
                      <Switch
                        value={timeBuckets.evening.enabled}
                        onValueChange={(value) => handleTimeBucketToggle('evening', value)}
                        trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
                        thumbColor={timeBuckets.evening.enabled ? '#8B5CF6' : '#9CA3AF'}
                        style={styles.timeBucketSwitch}
                      />
                    </View>
                  </View>
                </View>

                {/* Time Picker for buckets */}
                {showBucketTimePicker && (
                  <View style={styles.timePickerContainer}>
                    <DateTimePicker
                      value={getBucketTimeAsDate(showBucketTimePicker)}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleBucketTimeChange}
                      style={styles.timePicker}
                    />
                    {Platform.OS === 'ios' && (
                      <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => setShowBucketTimePicker(null)}
                      >
                        <Text style={styles.doneButtonText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, { backgroundColor: '#FDF2F8' }]}>
                  <Icon name="heart-outline" size={22} color="#EC4899" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Resource Suggestions</Text>
                  <Text style={styles.settingDescription}>
                    Show helpful resources based on check-in content
                  </Text>
                </View>
              </View>
              <Switch
                value={resourceSuggestionsEnabled}
                onValueChange={handleResourceSuggestionsToggle}
                trackColor={{ false: '#E5E7EB', true: '#FBCFE8' }}
                thumbColor={resourceSuggestionsEnabled ? '#EC4899' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Display Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.settingCard}>
            <View style={styles.placeholderContent}>
              <Icon name="color-palette-outline" size={32} color="#9CA3AF" />
              <Text style={styles.placeholderText}>Coming soon</Text>
              <Text style={styles.placeholderSubtext}>
                Theme and display options will be available in a future update
              </Text>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingCard}>
            <View style={styles.aboutContent}>
              <View style={styles.appIcon}>
                <Icon name="heart" size={32} color="#6366F1" />
              </View>
              <Text style={styles.appName}>SoulBloom</Text>
              <Text style={styles.appTagline}>Grow gently, live fully</Text>
              <Text style={styles.appVersion}>Version 0.5.0</Text>
              <Text style={styles.madeWith}>Made with ❤️</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <AddReminderModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingReminder(null);
        }}
        onSave={handleSaveReminder}
        editingReminder={editingReminder}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  settingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  timeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
  },
  timePickerContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  timePicker: {
    width: '100%',
    height: 150,
  },
  doneButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  doneButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  customRemindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
  },
  reminderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reminderDisabled: {
    color: colors.textSecondary,
  },
  reminderFrequency: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  deleteButton: {
    padding: 8,
    marginLeft: 4,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
  },
  placeholderSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  appIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  appTagline: {
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.primary,
    marginTop: 4,
  },
  appVersion: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  madeWith: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
  },
  bottomPadding: {
    height: 32,
  },
  // Multi-Checkin Styles
  frequencySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  frequencyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frequencyButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  frequencyButtonTextActive: {
    color: '#10B981',
  },
  timeBucketsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  timeBucketsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  timeBucketItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  timeBucketInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeBucketName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  timeBucketControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeBucketTime: {
    backgroundColor: colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  timeBucketTimeDisabled: {
    opacity: 0.5,
  },
  timeBucketTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  timeBucketTimeTextDisabled: {
    color: colors.textSecondary,
  },
  timeBucketSwitch: {
    transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
});

export default SettingsScreen;
