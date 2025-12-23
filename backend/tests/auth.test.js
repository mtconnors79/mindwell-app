/**
 * Authentication API Tests
 *
 * Tests for:
 * - POST /api/auth/register - user registration
 * - POST /api/auth/login - user login
 */

// Set JWT_SECRET before any imports so authController captures the correct value
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '1h';

const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');

// Mock Firebase verification (always reject for these tests)
jest.mock('../config/firebase', () => ({
  verifyIdToken: jest.fn().mockRejectedValue(new Error('Firebase not configured for tests'))
}));

// Create mock functions that we can configure per-test
const mockFindOne = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockProfileCreate = jest.fn();

// Mock models
jest.mock('../models', () => ({
  User: {
    findOne: mockFindOne,
    findByPk: mockFindByPk,
    create: mockCreate
  },
  Profile: {
    create: mockProfileCreate
  },
  CheckinResponse: {},
  MoodEntry: {}
}));

// Import controller after mocking
const authController = require('../controllers/authController');
const { User, Profile } = require('../models');

// Create test Express app
const createApp = () => {
  const app = express();
  app.use(express.json());

  // Routes
  app.post('/api/auth/register', authController.register);
  app.post('/api/auth/login', authController.login);

  return app;
};

describe('Authentication API', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid credentials', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      // Configure mocks for this test
      mockFindOne.mockResolvedValue(null); // No existing user
      mockCreate.mockResolvedValue({
        id: 1,
        email: userData.email,
        password_hash: '$2b$10$hashedpassword',
        created_at: new Date()
      });
      mockFindByPk.mockResolvedValue({
        id: 1,
        email: userData.email,
        created_at: new Date()
        // Note: no password_hash in response - controller uses attributes filter
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
    });

    it('should register user with name and age', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'John Doe',
        age: 25
      };

      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 1,
        email: userData.email,
        password_hash: '$2b$10$hashedpassword',
        created_at: new Date()
      });
      mockProfileCreate.mockResolvedValue({
        id: 1,
        user_id: 1,
        name: 'John Doe',
        age: 25
      });
      mockFindByPk.mockResolvedValue({
        id: 1,
        email: userData.email,
        created_at: new Date(),
        profile: { id: 1, name: 'John Doe', age: 25 }
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.status).toBe(201);
      expect(Profile.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'John Doe',
        age: 25
      }));
    });

    it('should reject registration without email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject registration without password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject registration with duplicate email', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
        password_hash: 'hashed_password',
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'NewPassword123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
      expect(res.body.message).toContain('already exists');
    });

    it('should hash the password before storing', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!'
      };

      mockFindOne.mockResolvedValue(null);
      mockCreate.mockImplementation(async (data) => ({
        id: 1,
        ...data,
        created_at: new Date()
      }));
      mockFindByPk.mockResolvedValue({
        id: 1,
        email: userData.email,
        created_at: new Date()
      });

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(User.create).toHaveBeenCalled();
      const createCall = User.create.mock.calls[0][0];
      expect(createCall.password_hash).toBeDefined();
      expect(createCall.password_hash).not.toBe(userData.password);
      // Verify it's a bcrypt hash
      expect(createCall.password_hash.startsWith('$2')).toBe(true);
    });

    it('should return a valid JWT token', async () => {
      const jwt = require('jsonwebtoken');

      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
        password_hash: '$2b$10$hashedpassword',
        created_at: new Date()
      });
      mockFindByPk.mockResolvedValue({
        id: 1,
        email: 'newuser@example.com',
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('newuser@example.com');
      expect(decoded.id).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    let testPasswordHash;

    beforeAll(async () => {
      testPasswordHash = await bcrypt.hash('ValidPassword123!', 10);
    });

    it('should login with valid credentials', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        password_hash: testPasswordHash,
        created_at: new Date(),
        profile: {
          id: 1,
          name: 'Test User',
          age: 30,
          preferences: {}
        }
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('testuser@example.com');
    });

    it('should reject login without email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject login without password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Email and password are required');
    });

    it('should reject login with non-existent email', async () => {
      mockFindOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login with incorrect password', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        password_hash: testPasswordHash,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return user profile with login response', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        password_hash: testPasswordHash,
        created_at: new Date(),
        profile: {
          id: 1,
          name: 'Test User',
          age: 30,
          preferences: {}
        }
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.profile).toBeDefined();
      expect(res.body.user.profile.name).toBe('Test User');
    });

    it('should return a valid JWT token on successful login', async () => {
      const jwt = require('jsonwebtoken');

      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        password_hash: testPasswordHash,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('testuser@example.com');
      expect(decoded.id).toBe(1);
    });

    it('should reject Firebase users trying to use password login', async () => {
      mockFindOne.mockResolvedValue({
        id: 2,
        email: 'firebaseuser@example.com',
        password_hash: 'firebase:some-uid',
        created_at: new Date(),
        profile: null
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'firebaseuser@example.com',
          password: 'AnyPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Firebase authentication');
    });

    it('should not expose password hash in response', async () => {
      mockFindOne.mockResolvedValue({
        id: 1,
        email: 'testuser@example.com',
        password_hash: testPasswordHash,
        created_at: new Date()
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'ValidPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.password_hash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });
  });

  describe('Security Tests', () => {
    it('should use bcrypt with appropriate salt rounds', async () => {
      const bcryptSpy = jest.spyOn(bcrypt, 'hash');

      mockFindOne.mockResolvedValue(null);
      mockCreate.mockResolvedValue({
        id: 1,
        email: 'security@example.com',
        password_hash: '$2b$10$hashedpassword',
        created_at: new Date()
      });
      mockFindByPk.mockResolvedValue({
        id: 1,
        email: 'security@example.com',
        created_at: new Date()
      });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'security@example.com',
          password: 'SecurePassword123!'
        });

      expect(bcryptSpy).toHaveBeenCalled();
      // Verify salt rounds (should be >= 10 for security)
      const [password, saltRounds] = bcryptSpy.mock.calls[0];
      expect(saltRounds).toBeGreaterThanOrEqual(10);
    });

    it('should handle empty email gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: '',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(400);
    });

    it('should handle empty password gracefully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: ''
        });

      expect(res.status).toBe(400);
    });

    it('should not leak information about whether email exists', async () => {
      // Login with non-existent email
      mockFindOne.mockResolvedValueOnce(null);
      const res1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePassword!'
        });

      // Login with wrong password for existing user
      const realPasswordHash = await bcrypt.hash('RealPassword!', 10);
      mockFindOne.mockResolvedValueOnce({
        id: 10,
        email: 'realuser@example.com',
        password_hash: realPasswordHash,
        created_at: new Date(),
        profile: null
      });

      const res2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'realuser@example.com',
          password: 'WrongPassword!'
        });

      // Both should return same generic error message
      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
      expect(res1.body.message).toBe(res2.body.message);
    });
  });
});
