/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * ARCHITECTURAL NOTICE:
 * - Single-instance (Monolith): State is shared in-memory within the Node.js process.
 * - Multi-instance (Clustered / Distributed): Each instance maintains its own local memory.
 *   For multi-instance deployments, rate limiting at the reverse-proxy / API Gateway level
 *   or an external shared store can be used.
 */

class InMemoryRateLimiter {
  constructor() {
    this.store = new Map();
    // Periodic garbage collection every 5 minutes to prevent memory leaks
    if (typeof setInterval !== 'undefined') {
      const gcTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (gcTimer.unref) gcTimer.unref();
    }
  }

  /**
   * Checks if a request for a specific key is within rate limits.
   *
   * @param {string} key - Identifier (e.g. 'auth:login:192.168.1.1')
   * @param {object} options
   * @param {number} options.maxRequests - Maximum allowed requests within window
   * @param {number} options.windowMs - Time window in milliseconds
   * @returns {{ allowed: boolean, limit: number, remaining: number, resetMs: number, retryAfterSeconds: number }}
   */
  check(key, { maxRequests = 10, windowMs = 60 * 1000 } = {}) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.store.get(key) || [];
    // Filter out timestamps outside the sliding window
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= maxRequests) {
      const oldestTimestamp = timestamps[0];
      const resetMs = Math.max(0, oldestTimestamp + windowMs - now);
      const retryAfterSeconds = Math.max(1, Math.ceil(resetMs / 1000));

      this.store.set(key, timestamps);
      return {
        allowed: false,
        limit: maxRequests,
        remaining: 0,
        resetMs,
        retryAfterSeconds,
      };
    }

    // Record current request timestamp
    timestamps.push(now);
    this.store.set(key, timestamps);

    return {
      allowed: true,
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - timestamps.length),
      resetMs: windowMs,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Resets rate limit for a given key (e.g., upon successful login)
   */
  reset(key) {
    this.store.delete(key);
  }

  /**
   * Prunes stale keys from memory
   */
  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.store.entries()) {
      const valid = timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (valid.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, valid);
      }
    }
  }
}

// Global singleton instance
export const rateLimiter = new InMemoryRateLimiter();

/**
 * Helper to extract client IP address from Next.js request headers
 */
export function getClientIp(request) {
  if (!request) return '127.0.0.1';

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return '127.0.0.1';
}

/**
 * Standard HTTP 429 response generator
 */
export function createRateLimitResponse(rateLimitResult) {
  return Response.json(
    {
      error: 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      retryAfter: rateLimitResult.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(rateLimitResult.retryAfterSeconds),
        'X-RateLimit-Limit': String(rateLimitResult.limit),
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
      },
    }
  );
}
