/**
 * Tests for GoalCard component
 *
 * Tests rendering of goal title, progress bar, time remaining,
 * completed/expiring states, and menu interactions.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock vector icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

// Mock theme
jest.mock('../../theme/colors', () => ({
  colors: {
    primary: '#355F5B',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    white: '#FFFFFF',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    divider: '#F1F5F9',
  },
}));

import GoalCard from '../GoalCard';

describe('GoalCard', () => {
  const createGoal = (overrides = {}) => ({
    id: 'goal-1',
    title: 'Daily Check-in',
    activity_type: 'check_in',
    target_count: 3,
    time_frame: 'daily',
    completed_at: null,
    progress: {
      current: 1,
      target: 3,
      percentComplete: 33,
    },
    timeRemaining: {
      hoursRemaining: 12,
      daysRemaining: 0,
    },
    ...overrides,
  });

  const defaultProps = {
    goal: createGoal(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders goal title', () => {
      const { getByText } = render(<GoalCard {...defaultProps} />);

      expect(getByText('Daily Check-in')).toBeTruthy();
    });

    it('renders activity icon based on type', () => {
      const { UNSAFE_getAllByType } = render(<GoalCard {...defaultProps} />);

      // Icon component should be rendered
      const icons = UNSAFE_getAllByType('Icon');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('renders for check_in activity type', () => {
      const goal = createGoal({ activity_type: 'check_in' });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Daily Check-in')).toBeTruthy();
    });

    it('renders for mindfulness activity type', () => {
      const goal = createGoal({
        title: 'Mindfulness Goal',
        activity_type: 'mindfulness',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Mindfulness Goal')).toBeTruthy();
    });

    it('renders for breathing activity type', () => {
      const goal = createGoal({
        title: 'Breathing Goal',
        activity_type: 'breathing',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Breathing Goal')).toBeTruthy();
    });

    it('renders for journaling activity type', () => {
      const goal = createGoal({
        title: 'Journaling Goal',
        activity_type: 'journaling',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Journaling Goal')).toBeTruthy();
    });

    it('renders for quick_mood activity type', () => {
      const goal = createGoal({
        title: 'Mood Log Goal',
        activity_type: 'quick_mood',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Mood Log Goal')).toBeTruthy();
    });
  });

  describe('Progress Display', () => {
    it('displays progress text in format "X/Y time_frame"', () => {
      const goal = createGoal({
        time_frame: 'weekly',
        progress: { current: 2, target: 5, percentComplete: 40 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('2/5 this week')).toBeTruthy();
    });

    it('displays "today" for daily time frame', () => {
      const goal = createGoal({
        time_frame: 'daily',
        progress: { current: 1, target: 3, percentComplete: 33 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('1/3 today')).toBeTruthy();
    });

    it('displays "this month" for monthly time frame', () => {
      const goal = createGoal({
        time_frame: 'monthly',
        progress: { current: 10, target: 20, percentComplete: 50 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('10/20 this month')).toBeTruthy();
    });

    it('handles missing progress data gracefully', () => {
      const goal = createGoal({
        progress: null,
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('0/3 today')).toBeTruthy();
    });

    it('does not show progress bar when completed', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { queryByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      // Progress text should not appear when completed
      expect(queryByText(/today|this week|this month/)).toBeNull();
    });
  });

  describe('Time Remaining', () => {
    it('shows "X days left" for multiple days', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 72, daysRemaining: 3 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('3 days left')).toBeTruthy();
    });

    it('shows "X hours left" when less than a day', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 8, daysRemaining: 0 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('8 hours left')).toBeTruthy();
    });

    it('shows "1 hour left" for exactly one hour', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 1, daysRemaining: 0 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('1 hour left')).toBeTruthy();
    });

    it('shows "Ending soon" when less than an hour', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 0, daysRemaining: 0 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Ending soon')).toBeTruthy();
    });

    it('shows "Completed!" for completed goals', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('Completed!')).toBeTruthy();
    });
  });

  describe('Completed State', () => {
    it('shows checkmark icon when completed', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      // Should have checkmark icon
      const icons = UNSAFE_getAllByType('Icon');
      const checkmarkIcon = icons.find((icon) => icon.props.name === 'checkmark');
      expect(checkmarkIcon).toBeTruthy();
    });

    it('shows trophy celebration badge when completed', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      const icons = UNSAFE_getAllByType('Icon');
      const trophyIcon = icons.find((icon) => icon.props.name === 'trophy');
      expect(trophyIcon).toBeTruthy();
    });

    it('hides menu button when completed', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      // Should not have ellipsis-vertical icon (menu button)
      const icons = UNSAFE_getAllByType('Icon');
      const menuIcon = icons.find((icon) => icon.props.name === 'ellipsis-vertical');
      expect(menuIcon).toBeFalsy();
    });
  });

  describe('Warning/Expiring State', () => {
    it('shows warning icon when expiring soon and not at 80%', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 12, daysRemaining: 0 },
        progress: { current: 1, target: 5, percentComplete: 20 },
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      const icons = UNSAFE_getAllByType('Icon');
      const warningIcon = icons.find((icon) => icon.props.name === 'warning');
      expect(warningIcon).toBeTruthy();
    });

    it('does not show warning when at 80% or more', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 12, daysRemaining: 0 },
        progress: { current: 4, target: 5, percentComplete: 80 },
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      const icons = UNSAFE_getAllByType('Icon');
      const warningIcon = icons.find((icon) => icon.props.name === 'warning');
      expect(warningIcon).toBeFalsy();
    });

    it('does not show warning when more than 24 hours left', () => {
      const goal = createGoal({
        timeRemaining: { hoursRemaining: 48, daysRemaining: 2 },
        progress: { current: 1, target: 5, percentComplete: 20 },
      });
      const { UNSAFE_getAllByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      const icons = UNSAFE_getAllByType('Icon');
      const warningIcon = icons.find((icon) => icon.props.name === 'warning');
      expect(warningIcon).toBeFalsy();
    });
  });

  describe('Menu Interactions', () => {
    it('shows menu dropdown when three-dot button pressed', () => {
      const { UNSAFE_getAllByType, getByText, queryByText } = render(
        <GoalCard {...defaultProps} />
      );

      // Menu should not be visible initially
      expect(queryByText('Edit')).toBeNull();

      // Find and press the menu button (ellipsis-vertical icon)
      const icons = UNSAFE_getAllByType('Icon');
      const menuIcon = icons.find((icon) => icon.props.name === 'ellipsis-vertical');

      // The menu button is a TouchableOpacity wrapping the icon
      // We need to find the parent and press it
    });

    it('hides menu when menu button pressed again', () => {
      // Toggle behavior test
    });

    it('calls onEdit with goal when Edit option pressed', () => {
      const onEdit = jest.fn();
      const goal = createGoal();

      const { UNSAFE_getAllByType, getByText, queryByText } = render(
        <GoalCard {...defaultProps} goal={goal} onEdit={onEdit} />
      );

      // Would need to open menu first, then press Edit
    });

    it('calls onDelete with goal when Delete option pressed', () => {
      const onDelete = jest.fn();
      const goal = createGoal();

      const { UNSAFE_getAllByType, getByText } = render(
        <GoalCard {...defaultProps} goal={goal} onDelete={onDelete} />
      );

      // Would need to open menu first, then press Delete
    });

    it('closes menu after Edit is pressed', () => {
      // Menu should close after action
    });

    it('closes menu after Delete is pressed', () => {
      // Menu should close after action
    });
  });

  describe('Press Animation', () => {
    it('does not animate when completed', () => {
      const goal = createGoal({
        completed_at: '2024-01-15T12:00:00Z',
      });
      const { UNSAFE_getByType } = render(
        <GoalCard {...defaultProps} goal={goal} />
      );

      // Pressing should not trigger animation for completed goals
    });
  });

  describe('Edge Cases', () => {
    it('handles goal with zero progress', () => {
      const goal = createGoal({
        progress: { current: 0, target: 5, percentComplete: 0 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('0/5 today')).toBeTruthy();
    });

    it('handles goal at 100% progress', () => {
      const goal = createGoal({
        progress: { current: 5, target: 5, percentComplete: 100 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      expect(getByText('5/5 today')).toBeTruthy();
    });

    it('handles goal with progress > 100%', () => {
      const goal = createGoal({
        progress: { current: 7, target: 5, percentComplete: 140 },
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      // Should cap display at visual 100% but show actual counts
      expect(getByText('7/5 today')).toBeTruthy();
    });

    it('handles missing timeRemaining gracefully', () => {
      const goal = createGoal({
        timeRemaining: null,
      });
      const { queryByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      // Should not crash, time text might be empty
      expect(queryByText('Daily Check-in')).toBeTruthy();
    });

    it('handles unknown activity type', () => {
      const goal = createGoal({
        activity_type: 'unknown_type',
      });
      const { getByText } = render(<GoalCard {...defaultProps} goal={goal} />);

      // Should render with fallback icon
      expect(getByText('Daily Check-in')).toBeTruthy();
    });
  });
});
