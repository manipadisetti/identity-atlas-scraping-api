// src/middleware/rateLimit.js
// Rate limiting middleware

const rateLimit = require('express-rate-limit');

const globalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '3600000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  message: {
    success: false,
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictRateLimiter = rateLimit({
  windowMs: 60000,
  max: 10,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'This endpoint has stricter rate limits. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  rateLimiter: globalRateLimiter,
  strictRateLimiter
};
