/**
 * Tests for GoalHistoryScreen
 *
 * Tests rendering past goals list, completed/expired status,
 * Clear History functionality with confirmation.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock vector icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock useFocusEffect to immediately call the callback
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    // useFocusEffect receives a callback created by useCallback
    // We need to call it synchronously during render
    const React = require('react');
    React.useEffect(() => {
      const cleanup = callback();
      return cleanup;
    }, []);
  },
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
    divider: '#F1F5F9',
  },
}));

// Mock goalsAPI
const mockGetHistory = jest.fn();
const mockClearHistory = jest.fn();

jest.mock('../../services/goalsApi', () => ({
  goalsAPI: {
    getHistory: () => mockGetHistory(),
    clearHistory: () => mockClearHistory(),
  },
}));

import GoalHistoryScreen from '../main/GoalHistoryScreen';

describe('GoalHistoryScreen', () => {
  const createHistoryGoal = (overrides = {}) => ({
    id: `goal-${Math.random().toString(36).slice(2)}`,
    title: 'Past Goal',
    activity_type: 'check_in',
    target_count: 5,
    time_frame: 'weekly',
    completed_at: null,
    is_active: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-07T00:00:00Z',
    ...overrides,
  });

  const mockCompletedGoal = createHistoryGoal({
    id: 'completed-1',
    title: 'Completed Goal',
    completed_at: '2024-01-05T12:00:00Z',
  });

  const mockExpiredGoal = createHistoryGoal({
    id: 'expired-1',
    title: 'Expired Goal',
    completed_at: null,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory.mockResolvedValue({
      data: { goals: [mockCompletedGoal, mockExpiredGoal] },
    });
    mockClearHistory.mockResolvedValue({ data: { message: 'History cleared' } });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  describe('Loading State', () => {
    it('shows loading indicator initially', () => {
      mockGetHistory.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { getByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(getByText('Loading history...')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no history', async () => {
      mockGetHistory.mockResolvedValue({ data: { goals: [] } });

      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(await findByText('No Past Goals')).toBeTruthy();
    });

    it('does not show Clear History button when empty', async () => {
      mockGetHistory.mockResolvedValue({ data: { goals: [] } });

      const { queryByText, findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      await findByText('No Past Goals');
      expect(queryByText('Clear History')).toBeNull();
    });
  });

  describe('Rendering Goals List', () => {
    it('renders past goals after loading', async () => {
      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(await findByText('Completed Goal')).toBeTruthy();
      expect(await findByText('Expired Goal')).toBeTruthy();
    });

    it('renders activity type and time frame metadata', async () => {
      mockGetHistory.mockResolvedValue({
        data: { goals: [mockCompletedGoal] },
      });

      const { findByText, findAllByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      await findByText('Completed Goal');
      // Should show "Check-in • Weekly"
      const metaTexts = await findAllByText(/Check-in.*Weekly/);
      expect(metaTexts.length).toBeGreaterThan(0);
    });

    it('renders target count information', async () => {
      mockGetHistory.mockResolvedValue({
        data: { goals: [mockCompletedGoal] },
      });

      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(await findByText('Target:')).toBeTruthy();
      expect(await findByText(/5 times per week/)).toBeTruthy();
    });

    it('renders created date', async () => {
      mockGetHistory.mockResolvedValue({
        data: { goals: [mockCompletedGoal] },
      });

      const { findByText, findAllByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      // Wait for goal to load first
      await findByText('Completed Goal');
      // Then look for Created: label
      const createdTexts = await findAllByText('Created:');
      expect(createdTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Status Display', () => {
    it('shows Completed label in summary for completed goals', async () => {
      mockGetHistory.mockResolvedValue({
        data: { goals: [mockCompletedGoal] },
      });

      const { findByText, findAllByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      // Wait for goal to load
      await findByText('Completed Goal');
      // Summary section shows "Completed" label
      const completedTexts = await findAllByText('Completed');
      expect(completedTexts.length).toBeGreaterThan(0);
    });

    it('shows Expired label in summary for expired goals', async () => {
      mockGetHistory.mockResolvedValue({
        data: { goals: [mockExpiredGoal] },
      });

      const { findByText, findAllByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      // Wait for goal to load
      await findByText('Expired Goal');
      // Summary section shows "Expired" label
      const expiredTexts = await findAllByText('Expired');
      expect(expiredTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Summary Section', () => {
    it('shows summary with completed and expired counts', async () => {
      const { findAllByText, findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      await findByText('Completed Goal'); // Wait for load
      // Summary should show counts
      expect((await findAllByText('1')).length).toBeGreaterThan(0);
    });

    it('shows summary with total count', async () => {
      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      await findByText('Completed Goal'); // Wait for load
      expect(await findByText('2')).toBeTruthy(); // 2 total
      expect(await findByText('Total')).toBeTruthy();
    });

    it('hides summary section when no goals', async () => {
      mockGetHistory.mockResolvedValue({ data: { goals: [] } });

      const { queryByText, findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      await findByText('No Past Goals');
      expect(queryByText('Total')).toBeNull();
    });
  });

  describe('Clear History Button', () => {
    it('renders Clear History button when goals exist', async () => {
      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(await findByText('Clear History')).toBeTruthy();
    });

    it('shows confirmation alert when Clear History pressed', async () => {
      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      const clearButton = await findByText('Clear History');
      fireEvent.press(clearButton);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Clear Goal History',
        'Are you sure you want to delete all past goals? This cannot be undone.',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel' }),
          expect.objectContaining({ text: 'Clear All', style: 'destructive' }),
        ])
      );
    });

    it('calls clearHistory API when confirmed', async () => {
      // Create a fresh spy that captures and executes the destructive action
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        if (buttons) {
          const clearAllBtn = buttons.find((b) => b.text === 'Clear All');
          if (clearAllBtn && clearAllBtn.onPress) {
            clearAllBtn.onPress();
          }
        }
      });

      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      const clearButton = await findByText('Clear History');

      await act(async () => {
        fireEvent.press(clearButton);
      });

      await waitFor(() => {
        expect(mockClearHistory).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('does not call API when Cancel is pressed', async () => {
      // Create a fresh spy that captures and executes the cancel action
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
        if (buttons) {
          const cancelBtn = buttons.find((b) => b.text === 'Cancel');
          if (cancelBtn && cancelBtn.onPress) {
            cancelBtn.onPress();
          }
        }
      });

      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      const clearButton = await findByText('Clear History');
      fireEvent.press(clearButton);

      expect(mockClearHistory).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });

  describe('Date Formatting', () => {
    it('formats dates in readable format', async () => {
      mockGetHistory.mockResolvedValue({
        data: {
          goals: [
            createHistoryGoal({
              id: 'dated-goal',
              title: 'Dated Goal',
              created_at: '2024-01-15T00:00:00Z',
              completed_at: '2024-01-15T12:00:00Z',
            }),
          ],
        },
      });

      const { findByText } = render(
        <GoalHistoryScreen navigation={mockNavigation} />
      );

      expect(await findByText('Jan 15, 2024')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('handles API error gracefully', () => {
      mockGetHistory.mockRejectedValue(new Error('Network error'));

      expect(() => {
        render(<GoalHistoryScreen navigation={mockNavigation} />);
      }).not.toThrow();
    });

    it('handles null data gracefully', () => {
      mockGetHistory.mockResolvedValue({ data: null });

      expect(() => {
        render(<GoalHistoryScreen navigation={mockNavigation} />);
      }).not.toThrow();
    });

    it('handles missing goals array gracefully', () => {
      mockGetHistory.mockResolvedValue({ data: {} });

      expect(() => {
        render(<GoalHistoryScreen navigation={mockNavigation} />);
      }).not.toThrow();
    });
  });
});
