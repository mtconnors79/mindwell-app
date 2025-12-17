const jwt = require('jsonwebtoken');
const { verifyIdToken } = require('../config/firebase');
const { User, Profile } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify a token - tries JWT first, then Firebase
 * Returns { type: 'jwt' | 'firebase', decoded: object }
 */
const verifyToken = async (token) => {
  // Try JWT first
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { type: 'jwt', decoded };
  } catch (jwtError) {
    // JWT failed, try Firebase
    try {
      const decoded = await verifyIdToken(token);
      return { type: 'firebase', decoded };
    } catch (firebaseError) {
      // Both failed
      throw new Error('Invalid token');
    }
  }
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use: Bearer <token>'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const { type, decoded } = await verifyToken(token);

    if (type === 'jwt') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        tokenType: 'jwt'
      };
    } else {
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        name: decoded.name || null,
        picture: decoded.picture || null,
        tokenType: 'firebase'
      };
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

const authenticateAndLoadUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid authorization header provided'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    const { type, decoded } = await verifyToken(token);

    let user;

    if (type === 'jwt') {
      // JWT token - load user by ID
      user = await User.findByPk(decoded.id, {
        attributes: ['id', 'email', 'created_at']
      });
    } else {
      // Firebase token - load user by email
      user = await User.findOne({
        where: { email: decoded.email },
        attributes: ['id', 'email', 'created_at']
      });
    }

    if (!user) {
      // For Firebase users, auto-create the user in the database
      if (type === 'firebase') {
        user = await User.create({
          email: decoded.email,
          password_hash: `firebase:${decoded.uid}`
        });

        // Create profile with Firebase display name if available
        await Profile.create({
          user_id: user.id,
          name: decoded.name || null
        });

        // Reload user with profile
        user = await User.findByPk(user.id, {
          attributes: ['id', 'email', 'created_at']
        });

        console.log(`Auto-created user for Firebase account: ${decoded.email}`);
      } else {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found in database'
        });
      }
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      dbId: user.id,  // Alias for backwards compatibility
      dbUser: user,
      dbCreatedAt: user.created_at,
      tokenType: type
    };

    // Add Firebase-specific fields if applicable
    if (type === 'firebase') {
      req.user.uid = decoded.uid;
      req.user.emailVerified = decoded.email_verified;
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    const { type, decoded } = await verifyToken(token);

    if (type === 'jwt') {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        tokenType: 'jwt'
      };
    } else {
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        tokenType: 'firebase'
      };
    }

    next();
  } catch (error) {
    // Token invalid, but route allows unauthenticated access
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateAndLoadUser,
  optionalAuth,
  verifyToken
};
