// src/middleware/rateLimit.js
// Rate Limiting Middleware

const rateLimitStore = new Map();

function rateLimitMiddleware(req, res, next) {
  try {
    const { projectId, rateLimit } = req.project;
    const now = Date.now();
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 3600000; // 1 hour default
    const windowStart = now - windowMs;

    // Get or create rate limit entry for this project
    if (!rateLimitStore.has(projectId)) {
      rateLimitStore.set(projectId, []);
    }

    const requests = rateLimitStore.get(projectId);

    // Remove old requests outside the time window
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    rateLimitStore.set(projectId, recentRequests);

    // Check if rate limit exceeded
    if (recentRequests.length >= rateLimit) {
      const oldestRequest = Math.min(...recentRequests);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `You have exceeded ${rateLimit} requests per hour`,
        retryAfter: retryAfter,
        limit: rateLimit,
        remaining: 0,
        resetAt: new Date(oldestRequest + windowMs).toISOString()
      });
    }

    // Add current request
    recentRequests.push(now);
    rateLimitStore.set(projectId, recentRequests);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit);
    res.setHeader('X-RateLimit-Remaining', rateLimit - recentRequests.length);
    res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

    next();

  } catch (error) {
    console.error('[RATE_LIMIT] Error:', error);
    // Don't block request on rate limit error
    next();
  }
}

// Clean up old entries periodically (run every hour)
setInterval(() => {
  const now = Date.now();
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW) || 3600000;
  
  for (const [projectId, requests] of rateLimitStore.entries()) {
    const recentRequests = requests.filter(timestamp => timestamp > now - windowMs);
    if (recentRequests.length === 0) {
      rateLimitStore.delete(projectId);
    } else {
      rateLimitStore.set(projectId, recentRequests);
    }
  }
}, 3600000); // Every hour

module.exports = {
  rateLimitMiddleware
};
