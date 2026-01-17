/**
 * API Rate Limiting Utilities
 * 
 * Server-side rate limiting for API routes
 * Uses in-memory storage (consider Redis for production)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
// In production, use Redis or similar distributed cache
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Rate limit configuration for different endpoints
 */
export const RATE_LIMITS = {
  // Public booking creation
  createBooking: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // Admin login attempts
  adminLogin: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // File uploads
  fileUpload: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  
  // General admin API
  adminApi: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Public API (slot availability, etc.)
  publicApi: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
};

/**
 * Get client identifier (IP address)
 * Falls back to a default if IP cannot be determined
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (for reverse proxies)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Check rate limit for a client
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number; retryAfter?: number } {
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  // No entry or expired entry
  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter,
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Rate limit middleware for API routes
 * Usage:
 *   export async function POST(request: Request) {
 *     const rateLimit = await rateLimitMiddleware(request, 'createBooking');
 *     if (!rateLimit.allowed) return rateLimit.response;
 *     // ... handle request
 *   }
 */
export async function rateLimitMiddleware(
  request: Request,
  limitType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; response?: Response }> {
  const config = RATE_LIMITS[limitType];
  const identifier = getClientIdentifier(request);
  
  const result = checkRateLimit(
    identifier,
    limitType,
    config.maxRequests,
    config.windowMs
  );
  
  if (!result.allowed) {
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
            'Retry-After': result.retryAfter?.toString() || '60',
          },
        }
      ),
    };
  }
  
  return { allowed: true };
}

/**
 * Add rate limit headers to response
 * Usage:
 *   return new Response(data, {
 *     headers: addRateLimitHeaders(headers, result),
 *   });
 */
export function addRateLimitHeaders(
  headers: Headers,
  limitResult: { remaining: number; resetAt: number }
): Headers {
  headers.set('X-RateLimit-Remaining', limitResult.remaining.toString());
  headers.set('X-RateLimit-Reset', new Date(limitResult.resetAt).toISOString());
  
  return headers;
}

/**
 * Reset rate limit for a specific client/endpoint
 * Useful for testing or manual intervention
 */
export function resetRateLimit(identifier: string, endpoint: string): void {
  const key = `${identifier}:${endpoint}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit status
 * Useful for monitoring/debugging
 */
export function getRateLimitStatus(
  identifier: string,
  endpoint: string
): { count: number; resetAt: number } | null {
  const key = `${identifier}:${endpoint}`;
  const entry = rateLimitStore.get(key);
  
  if (!entry) return null;
  
  return {
    count: entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Check if IP is in whitelist
 * (For future IP whitelisting feature)
 */
const IP_WHITELIST: string[] = [
  // Add trusted IPs here
  // '127.0.0.1',
  // '::1',
];

export function isWhitelistedIp(ip: string): boolean {
  return IP_WHITELIST.includes(ip);
}

/**
 * Check if IP is in blacklist
 * (For future IP blocking feature)
 */
const IP_BLACKLIST: string[] = [
  // Add blocked IPs here
];

export function isBlacklistedIp(ip: string): boolean {
  return IP_BLACKLIST.includes(ip);
}

/**
 * Example usage in API route:
 * 
 * export async function POST(request: Request) {
 *   // Apply rate limiting
 *   const rateLimit = await rateLimitMiddleware(request, 'createBooking');
 *   if (!rateLimit.allowed) {
 *     return rateLimit.response;
 *   }
 * 
 *   // Check IP blacklist
 *   const ip = getClientIdentifier(request);
 *   if (isBlacklistedIp(ip)) {
 *     return new Response('Forbidden', { status: 403 });
 *   }
 * 
 *   // Handle request normally
 *   // ...
 * }
 */
