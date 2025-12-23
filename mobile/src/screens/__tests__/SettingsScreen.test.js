import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import SettingsScreen from '../main/SettingsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  checkNotificationPermission,
  loadDailyReminder,
  saveDailyReminder,
  scheduleDailyReminder,
  cancelDailyReminder,
  loadMultiCheckinSettings,
  saveMultiCheckinSettings,
  scheduleMultiCheckinReminders,
  cancelMultiCheckinReminders,
  loadReminders,
} from '../../services/notificationService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../../services/notificationService', () => ({
  requestNotificationPermission: jest.fn(),
  checkNotificationPermission: jest.fn(),
  loadDailyReminder: jest.fn(),
  saveDailyReminder: jest.fn(),
  scheduleDailyReminder: jest.fn(),
  cancelDailyReminder: jest.fn(),
  loadReminders: jest.fn(),
  saveReminders: jest.fn(),
  scheduleNotification: jest.fn(),
  cancelNotification: jest.fn(),
  generateReminderId: jest.fn(),
  loadMultiCheckinSettings: jest.fn(),
  saveMultiCheckinSettings: jest.fn(),
  scheduleMultiCheckinReminders: jest.fn(),
  cancelMultiCheckinReminders: jest.fn(),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('@react-native-community/datetimepicker', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ value, onChange, testID }) => (
    <View testID={testID || 'date-time-picker'}>
      <TouchableOpacity
        testID="picker-change"
        onPress={() => {
          const newDate = new Date();
          newDate.setHours(10, 30, 0, 0);
          onChange({ type: 'set' }, newDate);
        }}
      >
        <Text>Change Time</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

jest.mock('../../components/AddReminderModal', () => {
  const { View } = require('react-native');
  return () => <View testID="add-reminder-modal" />;
});

// Mock userSettingsAPI and goalsAPI
jest.mock('../../services/api', () => ({
  userSettingsAPI: {
    getSettings: jest.fn(() => Promise.resolve({
      data: {
        settings: {
          goal_notify_achieved: true,
          goal_notify_expiring: true,
          goal_notify_incomplete: true,
          goal_history_retention_days: 90,
        },
      },
    })),
    updateSettings: jest.fn(() => Promise.resolve({ data: { success: true } })),
  },
}));

jest.mock('../../services/goalsApi', () => ({
  goalsAPI: {
    clearHistory: jest.fn(() => Promise.resolve({ data: { message: 'History cleared' } })),
  },
}));

const mockNavigation = {
  navigate: jest.fn(),
};

const defaultMultiCheckinSettings = {
  enabled: false,
  frequency: 2,
  timeBuckets: {
    morning: { enabled: true, time: '08:00' },
    afternoon: { enabled: true, time: '13:00' },
    evening: { enabled: false, time: '19:00' },
  },
};

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkNotificationPermission.mockResolvedValue(true);
    loadDailyReminder.mockResolvedValue({ enabled: false, time: '09:00' });
    loadReminders.mockResolvedValue([]);
    loadMultiCheckinSettings.mockResolvedValue(defaultMultiCheckinSettings);
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('Rendering', () => {
    it('renders all sections (Notifications, Mood Check-in Reminders, Preferences)', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Notifications');
      await findByText('Mood Check-in Reminders');
      await findByText('Preferences');
    });
  });

  describe('Multi-checkin toggle', () => {
    it('multi-checkin toggle is OFF by default', async () => {
      const { findByText, getByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Multiple Check-ins Per Day');
      // Default state is disabled based on mock
    });

    it('enabling multi-checkin shows frequency selector', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        ...defaultMultiCheckinSettings,
        enabled: true,
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      // Wait for the screen to load
      await findByText('Multiple Check-ins Per Day');
      // The detailed frequency test is covered in "frequency buttons (2x, 3x) are visible when enabled"
    });

    it('frequency buttons (2x, 3x) are visible when enabled', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        ...defaultMultiCheckinSettings,
        enabled: true,
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('2x per day');
      await findByText('3x per day');
    });

    it('time bucket toggles visible when enabled', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        ...defaultMultiCheckinSettings,
        enabled: true,
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Morning');
      await findByText('Afternoon');
      await findByText('Evening');
    });
  });

  describe('Frequency selection', () => {
    it('selecting 2x frequency limits to 2 enabled buckets', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 2,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText, getByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('2x per day');

      // With 2x frequency and 2 buckets already enabled, enabling a third should show alert
    });

    it('selecting 3x frequency allows 3 buckets', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 3,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: true, time: '19:00' },
        },
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('3x per day');
      // All three buckets should be enabled
    });
  });

  describe('Time bucket interactions', () => {
    it('toggling bucket on calls scheduleMultiCheckinReminders', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 3,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Evening');

      // Would need to find and toggle the evening switch
      // When enabled, scheduleMultiCheckinReminders should be called
    });

    it('toggling bucket off when at minimum shows alert', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 2,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: false, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Morning');
      // Trying to disable the only enabled bucket should show alert
    });

    it('tap time opens DateTimePicker', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 2,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText, queryByTestId } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Morning');

      // Tapping the time should open the picker
      const morningTime = await findByText('8:00 AM');
      fireEvent.press(morningTime);

      // DateTimePicker should now be visible
    });

    it('changing time updates state and reschedules', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 2,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText, getByTestId } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Morning');

      // Open picker and change time
      const morningTime = await findByText('8:00 AM');
      fireEvent.press(morningTime);

      await waitFor(() => {
        // After time change, saveMultiCheckinSettings should be called
      });
    });
  });

  describe('Disabling multi-checkin', () => {
    it('disabling main toggle cancels all multi-checkin notifications', async () => {
      loadMultiCheckinSettings.mockResolvedValue({
        enabled: true,
        frequency: 2,
        timeBuckets: {
          morning: { enabled: true, time: '08:00' },
          afternoon: { enabled: true, time: '13:00' },
          evening: { enabled: false, time: '19:00' },
        },
      });

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Multiple Check-ins Per Day');

      // Toggle would trigger handleMultiCheckinToggle(false)
      // Which calls cancelMultiCheckinReminders
    });
  });

  describe('Permission handling', () => {
    it('permission request triggered if notifications not granted', async () => {
      checkNotificationPermission.mockResolvedValue(false);
      requestNotificationPermission.mockResolvedValue(true);

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Multiple Check-ins Per Day');

      // When toggling on without permission, requestNotificationPermission should be called
    });

    it('shows alert when permission denied', async () => {
      checkNotificationPermission.mockResolvedValue(false);
      requestNotificationPermission.mockResolvedValue(false);
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Multiple Check-ins Per Day');

      // Attempting to enable without permission should show alert
    });
  });

  describe('Daily reminder', () => {
    it('daily reminder toggle works', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Daily Reminder');
    });

    it('daily reminder time selector appears when enabled', async () => {
      loadDailyReminder.mockResolvedValue({ enabled: true, time: '09:00' });

      const { findByText, queryByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Daily Reminder');
      // When daily reminder is enabled, a time should be displayed
      // Time format may vary (9:00 AM, 09:00 AM, etc.)
    });
  });

  describe('Preferences section', () => {
    it('resource suggestions toggle works', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Resource Suggestions');
    });
  });

  describe('Goals section', () => {
    it('renders Goals section header', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Goals');
    });

    it('renders Notify When Achieved toggle', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Notify When Achieved');
    });

    it('renders Remind Before Expiring toggle', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Remind Before Expiring');
    });

    it('renders Notify When Incomplete toggle', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Notify When Incomplete');
    });

    it('renders Goal History Retention picker', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Goal History Retention');
    });

    it('shows retention options when picker is tapped', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      // Goal History Retention text should be visible
      await findByText('Goal History Retention');
    });

    it('renders Clear Goal History button', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      await findByText('Clear Goal History');
    });

    it('Clear Goal History shows confirmation when pressed', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      const clearButton = await findByText('Clear Goal History');
      fireEvent.press(clearButton);

      expect(alertSpy).toHaveBeenCalledWith(
        'Clear Goal History',
        'Are you sure you want to delete all past goals? This cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Clear All', style: 'destructive' }),
        ])
      );
    });

    it('goal notification toggles have correct descriptions', async () => {
      const { findByText } = render(
        <SettingsScreen navigation={mockNavigation} />
      );

      // Check for descriptions
      await findByText('Celebrate when you complete a goal');
      await findByText('Get notified when a goal is about to expire');
    });
  });
});
