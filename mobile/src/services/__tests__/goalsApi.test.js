/**
 * Tests for Goals API service
 *
 * Tests all goalsAPI methods: getGoals, createGoal, updateGoal,
 * deleteGoal, getTemplates, getSummary, getHistory, clearHistory
 */

import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// Mock firebase auth
jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    currentUser: {
      uid: 'test-uid',
      email: 'test@example.com',
      getIdToken: jest.fn(() => Promise.resolve('mock-token')),
    },
  });
});

// Mock react-native-config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
}));

describe('goalsAPI', () => {
  let mockAxios;
  let api;
  let goalsAPI;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Re-import the modules to get fresh state
    api = require('../api').default;
    goalsAPI = require('../goalsApi').goalsAPI;

    // Set up axios mock adapter
    mockAxios = new MockAdapter(api);
  });

  afterEach(() => {
    if (mockAxios) {
      mockAxios.restore();
    }
  });

  describe('getGoals', () => {
    it('calls GET /api/goals', async () => {
      const mockGoals = [
        { id: '1', title: 'Daily Check-in', activity_type: 'check_in' },
        { id: '2', title: 'Weekly Mindfulness', activity_type: 'mindfulness' },
      ];

      mockAxios.onGet('/goals').reply(200, { goals: mockGoals });

      const response = await goalsAPI.getGoals();

      expect(response.data.goals).toEqual(mockGoals);
    });

    it('returns empty array when no goals exist', async () => {
      mockAxios.onGet('/goals').reply(200, { goals: [] });

      const response = await goalsAPI.getGoals();

      expect(response.data.goals).toEqual([]);
    });
  });

  describe('createGoal', () => {
    it('calls POST /api/goals with payload', async () => {
      const newGoal = {
        title: 'Daily Check-in',
        activity_type: 'check_in',
        target_count: 1,
        time_frame: 'daily',
      };

      const createdGoal = {
        id: 'new-id',
        ...newGoal,
        created_at: '2024-01-01T00:00:00Z',
      };

      mockAxios.onPost('/goals').reply(201, { goal: createdGoal });

      const response = await goalsAPI.createGoal(newGoal);

      expect(response.data.goal).toEqual(createdGoal);
    });

    it('sends correct request body', async () => {
      const newGoal = {
        title: 'Weekly Mindfulness',
        activity_type: 'mindfulness',
        target_count: 5,
        time_frame: 'weekly',
      };

      mockAxios.onPost('/goals').reply((config) => {
        const requestData = JSON.parse(config.data);
        expect(requestData.title).toBe('Weekly Mindfulness');
        expect(requestData.activity_type).toBe('mindfulness');
        expect(requestData.target_count).toBe(5);
        expect(requestData.time_frame).toBe('weekly');
        return [201, { goal: { id: '1', ...requestData } }];
      });

      await goalsAPI.createGoal(newGoal);
    });

    it('handles validation errors', async () => {
      mockAxios.onPost('/goals').reply(400, {
        message: 'Title is required',
      });

      await expect(goalsAPI.createGoal({})).rejects.toBeDefined();
    });
  });

  describe('getGoal', () => {
    it('calls GET /api/goals/:id', async () => {
      const goalId = 'goal-123';
      const mockGoal = {
        id: goalId,
        title: 'Daily Check-in',
        activity_type: 'check_in',
      };

      mockAxios.onGet(`/goals/${goalId}`).reply(200, { goal: mockGoal });

      const response = await goalsAPI.getGoal(goalId);

      expect(response.data.goal).toEqual(mockGoal);
    });

    it('handles 404 when goal not found', async () => {
      mockAxios.onGet('/goals/nonexistent').reply(404, {
        message: 'Goal not found',
      });

      await expect(goalsAPI.getGoal('nonexistent')).rejects.toBeDefined();
    });
  });

  describe('updateGoal', () => {
    it('calls PUT /api/goals/:id with payload', async () => {
      const goalId = 'goal-123';
      const updateData = {
        title: 'Updated Title',
        target_count: 3,
      };

      const updatedGoal = {
        id: goalId,
        ...updateData,
        activity_type: 'check_in',
        time_frame: 'daily',
      };

      mockAxios.onPut(`/goals/${goalId}`).reply(200, { goal: updatedGoal });

      const response = await goalsAPI.updateGoal(goalId, updateData);

      expect(response.data.goal.title).toBe('Updated Title');
      expect(response.data.goal.target_count).toBe(3);
    });

    it('sends correct request body', async () => {
      const goalId = 'goal-456';
      const updateData = {
        title: 'New Title',
        target_count: 7,
        time_frame: 'weekly',
      };

      mockAxios.onPut(`/goals/${goalId}`).reply((config) => {
        const requestData = JSON.parse(config.data);
        expect(requestData.title).toBe('New Title');
        expect(requestData.target_count).toBe(7);
        expect(requestData.time_frame).toBe('weekly');
        return [200, { goal: { id: goalId, ...requestData } }];
      });

      await goalsAPI.updateGoal(goalId, updateData);
    });
  });

  describe('deleteGoal', () => {
    it('calls DELETE /api/goals/:id', async () => {
      const goalId = 'goal-789';

      mockAxios.onDelete(`/goals/${goalId}`).reply(200, {
        message: 'Goal deleted',
      });

      const response = await goalsAPI.deleteGoal(goalId);

      expect(response.data.message).toBe('Goal deleted');
    });

    it('handles 404 when goal not found', async () => {
      mockAxios.onDelete('/goals/nonexistent').reply(404, {
        message: 'Goal not found',
      });

      await expect(goalsAPI.deleteGoal('nonexistent')).rejects.toBeDefined();
    });
  });

  describe('completeGoal', () => {
    it('calls POST /api/goals/:id/complete', async () => {
      const goalId = 'goal-complete';
      const completedGoal = {
        id: goalId,
        title: 'Daily Check-in',
        completed_at: '2024-01-15T12:00:00Z',
      };

      mockAxios.onPost(`/goals/${goalId}/complete`).reply(200, { goal: completedGoal });

      const response = await goalsAPI.completeGoal(goalId);

      expect(response.data.goal.completed_at).toBeDefined();
    });
  });

  describe('getTemplates', () => {
    it('calls GET /api/goals/templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          title: 'Daily Check-in',
          activity_type: 'check_in',
          target_count: 1,
          time_frame: 'daily',
          category: 'beginner',
        },
        {
          id: 'template-2',
          title: 'Weekly Mindfulness',
          activity_type: 'mindfulness',
          target_count: 3,
          time_frame: 'weekly',
          category: 'wellness',
        },
      ];

      mockAxios.onGet('/goals/templates').reply(200, { templates: mockTemplates });

      const response = await goalsAPI.getTemplates();

      expect(response.data.templates).toHaveLength(2);
      expect(response.data.templates[0].category).toBe('beginner');
    });

    it('supports category filter parameter', async () => {
      mockAxios.onGet('/goals/templates', { params: { category: 'beginner' } }).reply(200, {
        templates: [{ id: '1', category: 'beginner' }],
      });

      const response = await goalsAPI.getTemplates({ category: 'beginner' });

      expect(response.data.templates).toHaveLength(1);
    });

    it('supports activity_type filter parameter', async () => {
      mockAxios.onGet('/goals/templates', { params: { activity_type: 'mindfulness' } }).reply(200, {
        templates: [{ id: '2', activity_type: 'mindfulness' }],
      });

      const response = await goalsAPI.getTemplates({ activity_type: 'mindfulness' });

      expect(response.data.templates[0].activity_type).toBe('mindfulness');
    });
  });

  describe('getSummary', () => {
    it('calls GET /api/goals/summary', async () => {
      const mockSummary = {
        active: 3,
        completed: 10,
        abandoned: 2,
        completionRate: 83.3,
        currentStreak: 5,
      };

      mockAxios.onGet('/goals/summary').reply(200, mockSummary);

      const response = await goalsAPI.getSummary();

      expect(response.data.active).toBe(3);
      expect(response.data.completed).toBe(10);
      expect(response.data.completionRate).toBe(83.3);
    });
  });

  describe('getHistory', () => {
    it('calls GET /api/goals/history', async () => {
      const mockHistory = [
        {
          id: '1',
          title: 'Old Goal',
          completed_at: '2024-01-01T00:00:00Z',
          is_active: false,
        },
        {
          id: '2',
          title: 'Expired Goal',
          completed_at: null,
          is_active: false,
        },
      ];

      mockAxios.onGet('/goals/history').reply(200, { goals: mockHistory });

      const response = await goalsAPI.getHistory();

      expect(response.data.goals).toHaveLength(2);
    });

    it('supports pagination parameters', async () => {
      mockAxios.onGet('/goals/history', { params: { limit: 10, offset: 20 } }).reply(200, {
        goals: [],
        total: 50,
      });

      const response = await goalsAPI.getHistory({ limit: 10, offset: 20 });

      expect(response.data.total).toBe(50);
    });
  });

  describe('clearHistory', () => {
    it('calls DELETE /api/goals/history', async () => {
      mockAxios.onDelete('/goals/history').reply(200, {
        message: 'History cleared',
        deletedCount: 5,
      });

      const response = await goalsAPI.clearHistory();

      expect(response.data.message).toBe('History cleared');
      expect(response.data.deletedCount).toBe(5);
    });

    it('supports older_than_days parameter', async () => {
      mockAxios.onDelete('/goals/history', { params: { older_than_days: 30 } }).reply(200, {
        message: 'History cleared',
        deletedCount: 3,
      });

      const response = await goalsAPI.clearHistory(30);

      expect(response.data.deletedCount).toBe(3);
    });
  });
});
