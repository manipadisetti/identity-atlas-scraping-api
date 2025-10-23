// src/utils/cache.js
// Caching Utility to avoid redundant scraping

const NodeCache = require('node-cache');

// Initialize cache with 24-hour TTL by default
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 86400, // 24 hours
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: false // Don't clone data (faster)
});

/**
 * Generate cache key from source and identifier
 */
function generateCacheKey(source, identifier) {
  return `${source}:${identifier.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * Get cached data
 */
function getCached(source, identifier) {
  if (process.env.CACHE_ENABLED === 'false') {
    return null;
  }

  const key = generateCacheKey(source, identifier);
  const cached = cache.get(key);

  if (cached) {
    console.log(`[CACHE] ✓ Hit: ${key}`);
    return {
      ...cached,
      _cached: true,
      _cachedAt: cache.getTtl(key)
    };
  }

  console.log(`[CACHE] ✗ Miss: ${key}`);
  return null;
}

/**
 * Set cache data
 */
function setCached(source, identifier, data, ttl = null) {
  if (process.env.CACHE_ENABLED === 'false') {
    return false;
  }

  const key = generateCacheKey(source, identifier);
  const success = cache.set(key, data, ttl || undefined);

  if (success) {
    console.log(`[CACHE] ✓ Stored: ${key} (TTL: ${ttl || 'default'}s)`);
  } else {
    console.warn(`[CACHE] ✗ Failed to store: ${key}`);
  }

  return success;
}

/**
 * Delete cached data
 */
function deleteCached(source, identifier) {
  const key = generateCacheKey(source, identifier);
  const deleted = cache.del(key);
  
  if (deleted) {
    console.log(`[CACHE] ✓ Deleted: ${key}`);
  }
  
  return deleted > 0;
}

/**
 * Clear all cache
 */
function clearCache() {
  cache.flushAll();
  console.log('[CACHE] ✓ All cache cleared');
}

/**
 * Get cache statistics
 */
function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
}

/**
 * Wrapper function to cache scraping results
 */
async function withCache(source, identifier, scrapingFunction, ttl = null) {
  // Try to get from cache first
  const cached = getCached(source, identifier);
  if (cached) {
    return cached;
  }

  // If not cached, execute scraping function
  try {
    const data = await scrapingFunction();
    
    // Cache the result
    setCached(source, identifier, data, ttl);
    
    return data;
  } catch (error) {
    console.error(`[CACHE] Error in withCache for ${source}:${identifier}`, error.message);
    throw error;
  }
}

module.exports = {
  getCached,
  setCached,
  deleteCached,
  clearCache,
  getCacheStats,
  withCache,
  generateCacheKey
};
