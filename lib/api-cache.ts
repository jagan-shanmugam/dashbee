/**
 * In-memory cache with TTL for API routes.
 * Provides fast responses for identical requests and request deduplication.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class APICache {
  private cache: Map<string, CacheEntry<unknown>>;
  private pendingRequests: Map<string, PendingRequest<unknown>>;
  private readonly defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private readonly maxCacheSize: number = 1000;
  private readonly pendingTimeout: number = 30 * 1000; // 30 seconds

  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    // Cleanup stale entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generate a cache key from request parameters
   */
  generateKey(prefix: string, params: Record<string, unknown>): string {
    // Sort keys for consistent cache keys
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join("|");
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set data in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce max cache size with LRU-like behavior
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries matching a prefix
   */
  invalidatePattern(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or compute with deduplication.
   * If multiple requests for the same key arrive concurrently,
   * only one computation happens and all requesters get the result.
   */
  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if there's already a pending request for this key
    const pending = this.pendingRequests.get(key) as
      | PendingRequest<T>
      | undefined;
    if (pending) {
      // Check if the pending request hasn't timed out
      const now = Date.now();
      if (now - pending.timestamp < this.pendingTimeout) {
        // Wait for the existing request
        return pending.promise;
      } else {
        // Pending request timed out, remove it
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = computeFn();
    this.pendingRequests.set(key, {
      promise: promise as Promise<unknown>,
      timestamp: Date.now(),
    });

    try {
      const result = await promise;
      // Cache the result
      this.set(key, result, ttl);
      return result;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(key);
    }
  }

  /**
   * Cleanup expired entries and timed-out pending requests
   */
  private cleanup(): void {
    const now = Date.now();

    // Cleanup expired cache entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }

    // Cleanup timed-out pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.pendingTimeout) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    cacheSize: number;
    pendingRequests: number;
    maxCacheSize: number;
  } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      maxCacheSize: this.maxCacheSize,
    };
  }
}

// Singleton instance
const apiCache = new APICache();

export { apiCache };
export type { CacheEntry };
