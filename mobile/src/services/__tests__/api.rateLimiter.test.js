/**
 * Tests for API Rate Limiter functionality
 *
 * Tests the setRateLimitHandler, clearRateLimitHandler,
 * and 429 response handling in the API module.
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

// We need to import after mocks are set up
let api, setRateLimitHandler, clearRateLimitHandler;
let mockAxios;

describe('API Rate Limiter', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Re-import the module to get fresh state
    const apiModule = require('../api');
    api = apiModule.default;
    setRateLimitHandler = apiModule.setRateLimitHandler;
    clearRateLimitHandler = apiModule.clearRateLimitHandler;

    // Set up axios mock adapter
    mockAxios = new MockAdapter(api);
  });

  afterEach(() => {
    if (mockAxios) {
      mockAxios.restore();
    }
  });

  describe('setRateLimitHandler', () => {
    it('stores the handler function', () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      // Verify handler is stored by triggering a 429 and checking if it's called
      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
      });

      return api.get('/test').catch(() => {
        expect(handler).toHaveBeenCalled();
      });
    });

    it('replaces previous handler when called again', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      setRateLimitHandler(handler1);
      setRateLimitHandler(handler2);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
      });

      return api.get('/test').catch(() => {
        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalled();
      });
    });
  });

  describe('clearRateLimitHandler', () => {
    it('removes the handler so 429 does not trigger callback', () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);
      clearRateLimitHandler();

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
      });

      return api.get('/test').catch(() => {
        expect(handler).not.toHaveBeenCalled();
      });
    });
  });

  describe('429 Response Handling', () => {
    it('triggers rate limit handler on 429 response', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 60,
      });

      await expect(api.get('/test')).rejects.toBeDefined();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('passes correct isDistressed value when distressContext.hasRecentDistress is true', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 120,
        distressContext: {
          hasRecentDistress: true,
        },
        crisisResources: [{ name: '988 Lifeline', phone: '988' }],
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          isDistressed: true,
        })
      );
    });

    it('passes correct isDistressed value when distressContext.hasRecentDistress is false', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
        distressContext: {
          hasRecentDistress: false,
        },
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          isDistressed: false,
        })
      );
    });

    it('passes correct retryAfter value', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 90,
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 90,
        })
      );
    });

    it('defaults retryAfter to 60 when not provided', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          retryAfter: 60,
        })
      );
    });

    it('passes crisis resources from response', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      const crisisResources = [
        { id: '1', name: '988 Lifeline', phone: '988', type: 'call' },
        { id: '2', name: 'Crisis Text Line', phone: '741741', type: 'text' },
      ];

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
        crisisResources,
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          crisisResources,
        })
      );
    });

    it('defaults crisisResources to empty array when not provided', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          crisisResources: [],
        })
      );
    });

    it('passes message from response', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      const customMessage = "You're using the app very frequently. Take a breather!";

      mockAxios.onGet('/test').reply(429, {
        message: customMessage,
        retryAfter: 30,
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: customMessage,
        })
      );
    });

    it('uses default message when not provided', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {});

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You're using the app a lot. Give us a moment to catch up.",
        })
      );
    });

    it('rejects with isRateLimited flag set to true', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(429, {
        message: 'Rate limit exceeded',
        retryAfter: 30,
      });

      try {
        await api.get('/test');
      } catch (error) {
        expect(error.isRateLimited).toBe(true);
        expect(error.status).toBe(429);
      }
    });

    it('does not trigger handler for non-429 errors', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(500, {
        message: 'Internal server error',
      });

      await expect(api.get('/test')).rejects.toBeDefined();

      expect(handler).not.toHaveBeenCalled();
    });

    it('does not trigger handler for successful responses', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onGet('/test').reply(200, { data: 'success' });

      await api.get('/test');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Integration with API methods', () => {
    it('triggers rate limit handler for checkinAPI.create 429', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onPost('/checkins').reply(429, {
        message: 'Too many check-ins',
        retryAfter: 120,
        distressContext: { hasRecentDistress: true },
        crisisResources: [{ name: '988', phone: '988' }],
      });

      const { checkinAPI } = require('../api');

      await expect(checkinAPI.create({ mood: 'okay' })).rejects.toBeDefined();

      expect(handler).toHaveBeenCalledWith({
        isDistressed: true,
        retryAfter: 120,
        message: 'Too many check-ins',
        crisisResources: [{ name: '988', phone: '988' }],
      });
    });

    it('triggers rate limit handler for moodAPI.create 429', async () => {
      const handler = jest.fn();
      setRateLimitHandler(handler);

      mockAxios.onPost('/mood').reply(429, {
        message: 'Too many mood logs',
        retryAfter: 60,
      });

      const { moodAPI } = require('../api');

      await expect(moodAPI.create({ value: 5 })).rejects.toBeDefined();

      expect(handler).toHaveBeenCalled();
    });
  });
});
