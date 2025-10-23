// src/middleware/auth.js
// API Key Authentication Middleware

const API_KEYS = {
  // Identity Atlas
  [process.env.IDENTITY_ATLAS_API_KEY]: {
    projectName: 'Identity Atlas',
    projectId: 'identity-atlas',
    rateLimit: 1000, // requests per hour
    allowedEndpoints: ['*'], // all endpoints
    active: true,
    createdAt: '2025-01-01'
  },
  
  // Future projects can be added here
  [process.env.FUTURE_PROJECT_API_KEY]: {
    projectName: 'Future Project',
    projectId: 'future-project',
    rateLimit: 500,
    allowedEndpoints: ['*'],
    active: true,
    createdAt: '2025-01-01'
  }
};

// Usage tracking in-memory (in production, use database)
const usageTracking = new Map();

function authMiddleware(req, res, next) {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing Authorization header',
        message: 'Please provide API key in Authorization header: Bearer YOUR_API_KEY'
      });
    }

    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid Authorization format',
        message: 'Use format: Authorization: Bearer YOUR_API_KEY'
      });
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();

    // Validate API key
    const project = API_KEYS[apiKey];
    
    if (!project) {
      console.warn(`[AUTH] Invalid API key attempt: ${apiKey.substring(0, 10)}...`);
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        message: 'The provided API key is not valid'
      });
    }

    if (!project.active) {
      return res.status(403).json({
        success: false,
        error: 'API key disabled',
        message: 'This API key has been disabled. Please contact support.'
      });
    }

    // Check if endpoint is allowed for this project
    const requestedEndpoint = req.path;
    const isEndpointAllowed = 
      project.allowedEndpoints.includes('*') ||
      project.allowedEndpoints.some(endpoint => requestedEndpoint.includes(endpoint));

    if (!isEndpointAllowed) {
      return res.status(403).json({
        success: false,
        error: 'Endpoint not allowed',
        message: `Your API key does not have access to ${requestedEndpoint}`
      });
    }

    // Track usage
    const usageKey = `${project.projectId}:${new Date().toISOString().split('T')[0]}`;
    const currentUsage = usageTracking.get(usageKey) || { count: 0, endpoints: {} };
    currentUsage.count++;
    currentUsage.endpoints[requestedEndpoint] = (currentUsage.endpoints[requestedEndpoint] || 0) + 1;
    usageTracking.set(usageKey, currentUsage);

    // Attach project info to request object
    req.project = project;
    req.apiKey = apiKey;
    req.usageToday = currentUsage.count;

    console.log(`[AUTH] ✓ ${project.projectName} - ${requestedEndpoint} (${currentUsage.count} requests today)`);

    next();

  } catch (error) {
    console.error('[AUTH] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: error.message
    });
  }
}

// Endpoint to check usage (requires authentication)
function getUsageStats(req, res) {
  const { projectId } = req.project;
  const today = new Date().toISOString().split('T')[0];
  const usageKey = `${projectId}:${today}`;
  const usage = usageTracking.get(usageKey) || { count: 0, endpoints: {} };

  res.json({
    success: true,
    project: req.project.projectName,
    date: today,
    usage: {
      totalRequests: usage.count,
      rateLimit: req.project.rateLimit,
      remaining: Math.max(0, req.project.rateLimit - usage.count),
      endpointBreakdown: usage.endpoints
    }
  });
}

// Generate new API key (admin only - you can call this manually)
function generateApiKey() {
  return 'sk_' + Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

module.exports = {
  authMiddleware,
  getUsageStats,
  generateApiKey,
  API_KEYS
};
