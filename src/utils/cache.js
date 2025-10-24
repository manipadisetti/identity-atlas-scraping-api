// src/utils/cache.js
const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || '86400'),
  checkperiod: 600,
  useClones: false
});

const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

function getCacheKey(source, identifier) {
  return `${source}:${identifier}`;
}

async function withCache(source, identifier, fetchFunction, customTTL = null) {
  if (!CACHE_ENABLED) {
    console.log(`[CACHE] Cache disabled, fetching fresh data for ${source}:${identifier}`);
    return await fetchFunction();
  }

  const cacheKey = getCacheKey(source, identifier);
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    console.log(`[CACHE] ✓ Cache hit for ${cacheKey}`);
    return cachedData;
  }

  console.log(`[CACHE] ✗ Cache miss for ${cacheKey}, fetching fresh data...`);
  const freshData = await fetchFunction();

  const ttl = customTTL || parseInt(process.env.CACHE_TTL || '86400');
  cache.set(cacheKey, freshData, ttl);
  console.log(`[CACHE] ✓ Cached ${cacheKey} for ${ttl} seconds`);

  return freshData;
}

function clearCache(source = null, identifier = null) {
  if (source && identifier) {
    const cacheKey = getCacheKey(source, identifier);
    cache.del(cacheKey);
    console.log(`[CACHE] Cleared cache for ${cacheKey}`);
  } else if (source) {
    const keys = cache.keys();
    const sourceKeys = keys.filter(key => key.startsWith(`${source}:`));
    cache.del(sourceKeys);
    console.log(`[CACHE] Cleared ${sourceKeys.length} cache entries for ${source}`);
  } else {
    cache.flushAll();
    console.log('[CACHE] Cleared all cache');
  }
}

function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
}

module.exports = {
  cache,
  withCache,
  clearCache,
  getCacheStats,
  getCacheKey
};
