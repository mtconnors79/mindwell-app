const rateLimit = require('express-rate-limit');

// Standard error response for rate limiting
const createRateLimitHandler = (customMessage) => (req, res) => {
  res.status(429).json({
    error: 'Too Many Requests',
    message: customMessage || 'You have exceeded the rate limit. Please try again later.',
    retryAfter: req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime / 1000) : 60
  });
};

// Base options for all limiters
const baseOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
};

// General API rate limiter
// 100 requests per 15 minutes
const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: createRateLimitHandler('Too many requests, please try again later.')
});

// Strict limiter for authentication routes
// 5 requests per 15 minutes for login/register
const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  handler: createRateLimitHandler('Too many authentication attempts. Please try again in 15 minutes.')
});

// Limiter for sensitive operations (password reset, etc.)
// 3 requests per hour
const sensitiveLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 3,
  handler: createRateLimitHandler('Too many attempts. Please try again in an hour.')
});

// Limiter for AI/analysis endpoints (expensive operations)
// 20 requests per hour
const aiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 20,
  handler: createRateLimitHandler('AI analysis rate limit exceeded. Please try again later.')
});

// Limiter for check-in creation
// 10 check-ins per hour (reasonable for mental health tracking)
const checkinLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: createRateLimitHandler('Check-in rate limit exceeded. Please take a moment before checking in again.')
});

// Limiter for data export/bulk operations
// 5 requests per hour
const bulkLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: createRateLimitHandler('Bulk operation rate limit exceeded. Please try again later.')
});

// Very strict limiter for crisis-related endpoints
// Prevent abuse while ensuring legitimate users can access help
// 10 requests per 15 minutes
const crisisLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: createRateLimitHandler('Please take a moment. If you need immediate help, contact: 988 (Suicide & Crisis Lifeline)')
});

// Relaxed limiter for read-only operations
// 200 requests per 15 minutes
const readOnlyLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  max: 200,
  handler: createRateLimitHandler('Too many requests, please try again later.')
});

// Create a custom limiter with specific options
const createLimiter = (options) => {
  return rateLimit({
    ...baseOptions,
    handler: createRateLimitHandler(options.message),
    ...options
  });
};

// Skip rate limiting for certain conditions
const skipIf = (conditionFn) => (req, res, next) => {
  if (conditionFn(req)) {
    return next();
  }
  return generalLimiter(req, res, next);
};

// Skip rate limiting in test environment
const skipInTest = (limiter) => (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  return limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveLimiter,
  aiLimiter,
  checkinLimiter,
  bulkLimiter,
  crisisLimiter,
  readOnlyLimiter,
  createLimiter,
  skipIf,
  skipInTest
};
