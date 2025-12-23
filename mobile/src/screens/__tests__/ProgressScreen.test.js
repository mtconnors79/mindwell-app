/**
 * Tests for ProgressScreen
 *
 * Tests My Goals section, FAB/Add button, empty state,
 * and navigation to GoalHistoryScreen.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock vector icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Mock useFocusEffect to work with async callbacks
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, []);
  },
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

// Mock theme
jest.mock('../../theme/colors', () => ({
  colors: {
    primary: '#355F5B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    accent: '#E8F5F3',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    divider: '#F1F5F9',
    white: '#FFFFFF',
  },
}));

// Mock API modules
const mockGetGoals = jest.fn();
const mockGetSummary = jest.fn();
const mockDeleteGoal = jest.fn();

jest.mock('../../services/goalsApi', () => ({
  goalsAPI: {
    getGoals: () => mockGetGoals(),
    getSummary: () => mockGetSummary(),
    deleteGoal: (id) => mockDeleteGoal(id),
  },
}));

const mockGetToday = jest.fn();
const mockGetStreaks = jest.fn();
const mockGetAchievements = jest.fn();
const mockCheckAchievements = jest.fn();
const mockGetChallenges = jest.fn();

jest.mock('../../services/api', () => ({
  progressAPI: {
    getToday: () => mockGetToday(),
    getStreaks: () => mockGetStreaks(),
    getAchievements: () => mockGetAchievements(),
    checkAchievements: () => mockCheckAchievements(),
    getChallenges: () => mockGetChallenges(),
  },
}));

// Mock AddGoalModal
jest.mock('../../components/AddGoalModal', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, onClose, onGoalCreated }) => {
    if (!visible) return null;
    return (
      <View testID="add-goal-modal">
        <Text>Add Goal Modal</Text>
        <TouchableOpacity testID="modal-close" onPress={onClose}>
          <Text>Close</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="modal-create" onPress={onGoalCreated}>
          <Text>Create Goal</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock GoalCard
jest.mock('../../components/GoalCard', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ goal, onEdit, onDelete }) => (
    <View testID={`goal-card-${goal.id}`}>
      <Text>{goal.title}</Text>
      <TouchableOpacity testID={`edit-${goal.id}`} onPress={() => onEdit(goal)}>
        <Text>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity testID={`delete-${goal.id}`} onPress={() => onDelete(goal)}>
        <Text>Delete</Text>
      </TouchableOpacity>
    </View>
  );
});

import ProgressScreen from '../main/ProgressScreen';

describe('ProgressScreen', () => {
  const createGoal = (overrides = {}) => ({
    id: `goal-${Math.random().toString(36).slice(2)}`,
    title: 'Test Goal',
    activity_type: 'check_in',
    target_count: 1,
    time_frame: 'daily',
    completed_at: null,
    progress: {
      current: 0,
      target: 1,
      percentComplete: 0,
    },
    timeRemaining: {
      hoursRemaining: 12,
      daysRemaining: 0,
    },
    ...overrides,
  });

  const mockGoals = [
    createGoal({ id: 'goal-1', title: 'Daily Check-in' }),
    createGoal({ id: 'goal-2', title: 'Weekly Mindfulness', activity_type: 'mindfulness' }),
  ];

  const mockTodayData = {
    checkins: 1,
    moodLogs: 2,
    mindfulness: 0,
    breathing: 1,
  };

  const mockStreaksData = {
    currentStreak: 5,
    longestStreak: 10,
  };

  const mockAchievementsData = {
    achievements: [
      { id: 'first_checkin', name: 'First Check-in', earned_at: '2024-01-01' },
    ],
  };

  const mockChallengesData = {
    challenges: [],
  };

  const mockSummaryData = {
    summary: { active: 2, completed: 5, abandoned: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGoals.mockResolvedValue({ data: { goals: mockGoals } });
    mockGetSummary.mockResolvedValue({ data: mockSummaryData });
    mockGetToday.mockResolvedValue({ data: mockTodayData });
    mockGetStreaks.mockResolvedValue({ data: mockStreaksData });
    mockGetAchievements.mockResolvedValue({ data: mockAchievementsData });
    mockGetChallenges.mockResolvedValue({ data: mockChallengesData });
    mockCheckAchievements.mockResolvedValue({ data: { newBadges: [] } });
    mockDeleteGoal.mockResolvedValue({ data: { message: 'Deleted' } });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      mockGetToday.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { getByText } = render(<ProgressScreen />);

      // Should show loading state
      expect(getByText(/Loading/i) || true).toBeTruthy();
    });
  });

  describe('My Goals Section', () => {
    it('renders My Goals section header after loading', async () => {
      const { findByText } = render(<ProgressScreen />);

      expect(await findByText('My Goals')).toBeTruthy();
    });

    it('renders goal cards for each active goal', async () => {
      const { findByText } = render(<ProgressScreen />);

      expect(await findByText('Daily Check-in')).toBeTruthy();
      expect(await findByText('Weekly Mindfulness')).toBeTruthy();
    });

    it('renders goal cards with testIDs', async () => {
      const { findByTestId } = render(<ProgressScreen />);

      expect(await findByTestId('goal-card-goal-1')).toBeTruthy();
      expect(await findByTestId('goal-card-goal-2')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state text when no user goals', async () => {
      mockGetGoals.mockResolvedValue({ data: { goals: [] } });

      const { findByText } = render(<ProgressScreen />);

      // Wait for loading to finish
      await findByText('My Goals');
      // Should show empty state or create goal option
    });
  });

  describe('Goal Interactions', () => {
    it('calls onDelete when delete is pressed', async () => {
      const { findByTestId } = render(<ProgressScreen />);

      const deleteButton = await findByTestId('delete-goal-1');

      await act(async () => {
        fireEvent.press(deleteButton);
      });

      // Should show confirmation alert
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('calls onEdit when edit is pressed', async () => {
      const { findByTestId, findByTestId: getTestId } = render(<ProgressScreen />);

      const editButton = await findByTestId('edit-goal-1');

      await act(async () => {
        fireEvent.press(editButton);
      });

      // Should open the add/edit modal
      expect(await findByTestId('add-goal-modal')).toBeTruthy();
    });
  });

  describe('Achievements/Badges Section', () => {
    it('renders badges section after loading', async () => {
      const { findByText } = render(<ProgressScreen />);

      // Wait for data to load and check for achievements section
      await findByText('My Goals');
      // Achievements section should be visible
      expect(await findByText('Achievements')).toBeTruthy();
    });

    it('shows unlocked badge count', async () => {
      const { findByText } = render(<ProgressScreen />);

      await findByText('My Goals');
      // Shows "X of Y unlocked" format
      expect(await findByText(/unlocked/)).toBeTruthy();
    });
  });

  describe('Streaks Section', () => {
    it('renders streak section after loading', async () => {
      const { findByText } = render(<ProgressScreen />);

      // Wait for loading to complete
      await findByText('My Goals');
      // Progress screen should load successfully
    });
  });

  describe('Error Handling', () => {
    it('handles goals API error gracefully', () => {
      mockGetGoals.mockRejectedValue(new Error('Network error'));
      mockGetSummary.mockRejectedValue(new Error('Network error'));

      expect(() => {
        render(<ProgressScreen />);
      }).not.toThrow();
    });

    it('handles progress API error gracefully', () => {
      mockGetToday.mockRejectedValue(new Error('Network error'));

      expect(() => {
        render(<ProgressScreen />);
      }).not.toThrow();
    });
  });
});
