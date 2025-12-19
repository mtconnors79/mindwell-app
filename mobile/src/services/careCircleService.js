import api from './api';

/**
 * Care Circle API Service
 * Handles all Care Circle related API calls
 */

export const careCircleAPI = {
  /**
   * Get all connections for the current user
   * Returns connections as both patient and trusted person
   */
  getConnections: () =>
    api.get('/care-circle/connections'),

  /**
   * Send a Care Circle invitation
   * @param {string} email - Email of the trusted person to invite
   * @param {string} name - Optional name of the trusted person
   * @param {string} tier - Sharing tier: 'data_only' or 'full'
   */
  sendInvite: (email, name, tier = 'data_only') =>
    api.post('/care-circle/invite', {
      email,
      name: name || undefined,
      sharing_tier: tier,
    }),

  /**
   * Get public invite details by token
   * @param {string} token - Invite token
   */
  getInviteDetails: (token) =>
    api.get(`/care-circle/invite/${token}`),

  /**
   * Accept a Care Circle invitation
   * @param {string} token - Invite token
   */
  acceptInvite: (token) =>
    api.post(`/care-circle/accept/${token}`),

  /**
   * Decline a Care Circle invitation (public, no auth required)
   * @param {string} token - Invite token
   */
  declineInvite: (token) =>
    api.post(`/care-circle/decline/${token}`),

  /**
   * Update sharing tier for a connection
   * @param {string} connectionId - Connection UUID
   * @param {string} newTier - New sharing tier: 'data_only' or 'full'
   */
  updateTier: (connectionId, newTier) =>
    api.put(`/care-circle/${connectionId}/tier`, {
      sharing_tier: newTier,
    }),

  /**
   * Resend invitation for a pending connection
   * @param {string} connectionId - Connection UUID
   */
  resendInvite: (connectionId) =>
    api.post(`/care-circle/${connectionId}/resend`),

  /**
   * Revoke a Care Circle connection
   * Can be done by either patient or trusted person
   * @param {string} connectionId - Connection UUID
   */
  revokeConnection: (connectionId) =>
    api.delete(`/care-circle/${connectionId}`),

  /**
   * Get audit log for a connection (patient only)
   * @param {string} connectionId - Connection UUID
   * @param {object} params - Optional: { limit, offset }
   */
  getAuditLog: (connectionId, params = {}) =>
    api.get(`/care-circle/audit/${connectionId}`, { params }),

  /**
   * Get shared summary data for a patient (trusted person only)
   * @param {number} patientId - Patient's user ID
   */
  getSharedSummary: (patientId) =>
    api.get(`/care-circle/shared/${patientId}/summary`),

  /**
   * Get shared mood data for a patient (trusted person only)
   * @param {number} patientId - Patient's user ID
   * @param {object} params - Optional: { start_date, end_date, limit, offset }
   */
  getSharedMoods: (patientId, params = {}) =>
    api.get(`/care-circle/shared/${patientId}/moods`, { params }),

  /**
   * Get shared check-in data for a patient (trusted person only)
   * @param {number} patientId - Patient's user ID
   * @param {object} params - Optional: { start_date, end_date, limit, offset }
   */
  getSharedCheckins: (patientId, params = {}) =>
    api.get(`/care-circle/shared/${patientId}/checkins`, { params }),

  /**
   * Get shared trend data for a patient (trusted person only)
   * @param {number} patientId - Patient's user ID
   * @param {string} period - Period: '7d', '30d', or '90d'
   */
  getSharedTrends: (patientId, period = '30d') =>
    api.get(`/care-circle/shared/${patientId}/trends`, { params: { period } }),

  /**
   * Export shared data for a patient (trusted person only)
   * @param {number} patientId - Patient's user ID
   * @param {object} params - Optional: { start_date, end_date, format }
   */
  exportSharedData: (patientId, params = {}) =>
    api.get(`/care-circle/shared/${patientId}/export`, { params }),
};

export default careCircleAPI;
