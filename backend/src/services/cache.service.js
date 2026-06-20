/**
 * Cache Service — optional caching layer for generation deduplication.
 *
 * Caches generation results keyed by:
 *   garmentHash + selfieHash + modelVersion + promptVersion
 *
 * Currently uses in-memory Map (per-pod).
 * Can be replaced with Redis/Memcache for shared cache across pods.
 */
import { logger } from "../utils/logger.js";

// In-memory cache (per-pod). Replace with Redis for shared caching.
const cache = new Map();

/**
 * Generate a composite cache key from generation inputs.
 *
 * @param {object} params
 * @param {string} params.garmentHash
 * @param {string} params.selfieHash
 * @param {string} params.modelUsed
 * @param {string} params.promptVersion
 * @returns {string}
 */
const buildCacheKey = ({ garmentHash, selfieHash, modelUsed, promptVersion }) => {
    return `${garmentHash}:${selfieHash}:${modelUsed}:${promptVersion}`;
};

/**
 * Check cache for an existing generation.
 *
 * @param {string} key - Composite cache key
 * @returns {object|null} Cached result or null
 */
const lookup = (key) => {
    const cached = cache.get(key);
    if (cached) {
        logger.info("Cache: HIT", { key });
        return cached;
    }
    logger.debug("Cache: MISS", { key });
    return null;
};

/**
 * Store a generation result in cache.
 *
 * @param {string} key - Composite cache key
 * @param {object} value - Generation result to cache
 * @param {number} [ttlMs=3600000] - Time-to-live in milliseconds (default 1hr)
 */
const store = (key, value, ttlMs = 60 * 60 * 1000) => {
    cache.set(key, value);

    // Auto-evict after TTL
    setTimeout(() => {
        cache.delete(key);
        logger.debug("Cache: Evicted", { key });
    }, ttlMs);

    logger.info("Cache: Stored", { key });
};

/**
 * Invalidate a cache entry.
 *
 * @param {string} key
 */
const invalidate = (key) => {
    cache.delete(key);
    logger.info("Cache: Invalidated", { key });
};

/**
 * Get current cache stats.
 *
 * @returns {{ size: number }}
 */
const stats = () => {
    return { size: cache.size };
};

export const cacheService = { buildCacheKey, lookup, store, invalidate, stats };
