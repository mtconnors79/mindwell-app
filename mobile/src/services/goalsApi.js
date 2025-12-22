import api from './api';

export const goalsAPI = {
  // Get all active goals with progress
  getGoals: () =>
    api.get('/goals'),

  // Create a new goal
  createGoal: (data) =>
    api.post('/goals', data),

  // Get a single goal
  getGoal: (id) =>
    api.get(`/goals/${id}`),

  // Update a goal
  updateGoal: (id, data) =>
    api.put(`/goals/${id}`, data),

  // Delete a goal (soft delete)
  deleteGoal: (id) =>
    api.delete(`/goals/${id}`),

  // Mark goal as completed
  completeGoal: (id) =>
    api.post(`/goals/${id}/complete`),

  // Get goal templates
  getTemplates: (params) =>
    api.get('/goals/templates', { params }),

  // Get goals summary
  getSummary: () =>
    api.get('/goals/summary'),

  // Get goal history (completed/deleted goals)
  getHistory: (params) =>
    api.get('/goals/history', { params }),

  // Clear goal history
  clearHistory: (olderThanDays) =>
    api.delete('/goals/history', { params: { older_than_days: olderThanDays } }),
};

export default goalsAPI;
