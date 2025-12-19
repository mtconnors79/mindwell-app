import axios from 'axios';
import { getAuth } from 'firebase/auth';

// Base URL from environment variable
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add Firebase auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error.message);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Force refresh the token
          const token = await currentUser.getIdToken(true);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError.message);
      }
    }

    // Format error message
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({
      status: error.response?.status,
      message: errorMessage,
      data: error.response?.data,
    });
  }
);

// Auth API
export const authAPI = {
  loginWithFirebase: () => api.post('/auth/login/firebase'),
  registerWithFirebase: (data) => api.post('/auth/register/firebase', data),
  getMe: () => api.get('/auth/me'),
};

// Care Circle API
export const careCircleAPI = {
  // Connections
  getConnections: () => api.get('/care-circle/connections'),
  sendInvite: (email, name, tier) =>
    api.post('/care-circle/invite', { email, name, sharing_tier: tier }),
  updateTier: (connectionId, newTier) =>
    api.put(`/care-circle/${connectionId}/tier`, { sharing_tier: newTier }),
  revokeConnection: (connectionId) =>
    api.delete(`/care-circle/${connectionId}`),
  getAuditLog: (connectionId, params) =>
    api.get(`/care-circle/audit/${connectionId}`, { params }),

  // Invite (public endpoints)
  getInviteDetails: (token) => api.get(`/care-circle/invite/${token}`),
  acceptInvite: (token) => api.post(`/care-circle/accept/${token}`),
  declineInvite: (token) => api.post(`/care-circle/decline/${token}`),

  // Shared Data (trusted person viewing patient data)
  getSharedSummary: (patientId) =>
    api.get(`/care-circle/shared/${patientId}/summary`),
  getSharedMoods: (patientId, params) =>
    api.get(`/care-circle/shared/${patientId}/moods`, { params }),
  getSharedCheckins: (patientId, params) =>
    api.get(`/care-circle/shared/${patientId}/checkins`, { params }),
  getSharedTrends: (patientId, period = '30d') =>
    api.get(`/care-circle/shared/${patientId}/trends`, { params: { period } }),
  exportSharedData: (patientId, params) =>
    api.get(`/care-circle/shared/${patientId}/export`, { params }),
};

// Profile API
export const profileAPI = {
  get: () => api.get('/profile'),
  update: (data) => api.put('/profile', data),
};

export default api;
