/**
 * Simple in-memory cache for API responses
 * Helps reduce database load for frequently accessed data
 */

class SimpleCache {
  constructor(ttl = 60000) { // Default TTL: 60 seconds
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Generate cache key from request parameters
   */
  generateKey(prefix, params) {
    const sortedParams = Object.keys(params || {})
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached value if exists and not expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cache value with current timestamp
   */
  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    // Cleanup old entries if cache gets too large (> 1000 entries)
    if (this.cache.size > 1000) {
      const now = Date.now();
      for (const [k, v] of this.cache.entries()) {
        if (now - v.timestamp > this.ttl) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Clear specific key or entire cache
   */
  clear(key = null) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      ttl: this.ttl
    };
  }
}

// Create cache instances with different TTLs based on data volatility
export const statsCache = new SimpleCache(30000);        // 30 seconds for stats
export const analyticsCache = new SimpleCache(60000);    // 60 seconds for analytics
export const adsCache = new SimpleCache(120000);         // 2 minutes for ad listings