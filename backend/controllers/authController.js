const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Profile } = require('../models');
const { verifyIdToken } = require('../config/firebase');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const register = async (req, res) => {
  try {
    const { email, password, name, age } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const user = await User.create({
      email,
      password_hash
    });

    // Create profile if name or age provided
    if (name || age) {
      await Profile.create({
        user_id: user.id,
        name: name || null,
        age: age || null
      });
    }

    // Fetch user with profile
    const userWithProfile = await User.findByPk(user.id, {
      attributes: ['id', 'email', 'created_at'],
      include: [{
        association: 'profile',
        attributes: ['id', 'name', 'age', 'preferences']
      }]
    });

    // Generate JWT token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userWithProfile
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

const registerWithFirebase = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firebase ID token required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);

    const { name, age } = req.body;

    // Check if user already exists
    let user = await User.findOne({ where: { email: decodedToken.email } });

    if (user) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    // Create user with Firebase UID as password_hash placeholder
    user = await User.create({
      email: decodedToken.email,
      password_hash: `firebase:${decodedToken.uid}`
    });

    // Create profile
    await Profile.create({
      user_id: user.id,
      name: name || decodedToken.name || null,
      age: age || null
    });

    // Fetch user with profile
    const userWithProfile = await User.findByPk(user.id, {
      attributes: ['id', 'email', 'created_at'],
      include: [{
        association: 'profile',
        attributes: ['id', 'name', 'age', 'preferences']
      }]
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: userWithProfile
    });
  } catch (error) {
    console.error('Firebase registration error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user'
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{
        association: 'profile',
        attributes: ['id', 'name', 'age', 'preferences']
      }]
    });

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Check if user registered with Firebase
    if (user.password_hash.startsWith('firebase:')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'This account uses Firebase authentication. Please login with Firebase.'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

const loginWithFirebase = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firebase ID token required'
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);

    // Find or create user
    let user = await User.findOne({
      where: { email: decodedToken.email },
      include: [{
        association: 'profile',
        attributes: ['id', 'name', 'age', 'preferences']
      }]
    });

    let isNewUser = false;

    if (!user) {
      // Auto-register user on first Firebase login
      user = await User.create({
        email: decodedToken.email,
        password_hash: `firebase:${decodedToken.uid}`
      });

      await Profile.create({
        user_id: user.id,
        name: decodedToken.name || null
      });

      // Reload with profile
      user = await User.findByPk(user.id, {
        include: [{
          association: 'profile',
          attributes: ['id', 'name', 'age', 'preferences']
        }]
      });

      isNewUser = true;
    }

    res.json({
      message: isNewUser ? 'User registered and logged in successfully' : 'Login successful',
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error('Firebase login error:', error.message);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token has expired'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to login'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.dbId, {
      attributes: ['id', 'email', 'created_at'],
      include: [
        {
          association: 'profile',
          attributes: ['id', 'name', 'age', 'preferences']
        },
        {
          association: 'emergencyContacts',
          attributes: ['id', 'name', 'phone', 'relationship']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error.message);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch user'
    });
  }
};

module.exports = {
  register,
  registerWithFirebase,
  login,
  loginWithFirebase,
  getMe
};
