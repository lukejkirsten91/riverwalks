import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';
import { getEnvironment } from './environment';

/**
 * Simple in-memory rate limiting for API routes
 * Protects against brute force attacks and API abuse
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  /** Maximum number of requests per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Custom identifier function (defaults to IP) */
  keyGenerator?: (req: NextApiRequest) => string;
  /** Skip rate limiting for certain conditions */
  skip?: (req: NextApiRequest) => boolean;
  /** Message to return when rate limited */
  message?: string;
}

/**
 * Get client identifier for rate limiting
 */
function getClientId(req: NextApiRequest, keyGenerator?: (req: NextApiRequest) => string): string {
  if (keyGenerator) {
    return keyGenerator(req);
  }
  
  // Try to get real IP address
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  const ip = forwarded?.split(',')[0] || realIp || req.connection?.remoteAddress || 'unknown';
  
  return ip;
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return (req: NextApiRequest, res: NextApiResponse): boolean => {
    // Skip rate limiting in development environment
    if (getEnvironment() === 'development') {
      return true;
    }
    
    // Skip if custom skip function returns true
    if (config.skip && config.skip(req)) {
      return true;
    }
    
    const clientId = getClientId(req, config.keyGenerator);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create rate limit entry
    let entry = rateLimitStore.get(clientId);
    
    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        lastRequest: now
      };
    }
    
    // Increment request count
    entry.count++;
    entry.lastRequest = now;
    rateLimitStore.set(clientId, entry);
    
    // Check if rate limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      logger.warn('Rate limit exceeded', {
        clientId: clientId.substring(0, 8) + '...', // Partial IP for privacy
        count: entry.count,
        maxRequests: config.maxRequests,
        retryAfter,
        userAgent: req.headers['user-agent']?.substring(0, 100)
      });
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
      res.setHeader('Retry-After', retryAfter.toString());
      
      res.status(429).json({
        error: config.message || 'Too many requests',
        retryAfter
      });
      
      return false;
    }
    
    // Set rate limit headers for successful requests
    const remaining = Math.max(0, config.maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());
    
    return true;
  };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** Strict rate limiting for authentication endpoints */
  auth: rateLimit({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.'
  }),
  
  /** Rate limiting for API endpoints */
  api: rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many API requests. Please try again later.'
  }),
  
  /** Strict rate limiting for admin endpoints */
  admin: rateLimit({
    maxRequests: 20,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many admin requests. Please try again later.'
  }),
  
  /** Rate limiting for file uploads/exports */
  upload: rateLimit({
    maxRequests: 10,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many upload requests. Please try again later.'
  }),
  
  /** Rate limiting for payment endpoints */
  payment: rateLimit({
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
    message: 'Too many payment attempts. Please try again later.'
  }),
  
  /** Rate limiting for contact/feedback forms */
  contact: rateLimit({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many messages sent. Please try again later.'
  })
};

/**
 * Rate limiting by user ID for authenticated requests
 */
export function rateLimitByUser(config: Omit<RateLimitConfig, 'keyGenerator'>) {
  return rateLimit({
    ...config,
    keyGenerator: (req) => {
      // Try to extract user ID from various sources
      const authHeader = req.headers.authorization;
      if (authHeader) {
        // This is a simplified approach - in practice you'd decode the JWT
        const token = authHeader.replace('Bearer ', '');
        return `user_${token.substring(0, 16)}`; // Use first 16 chars of token
      }
      
      // Fallback to IP-based rate limiting
      return getClientId(req);
    }
  });
}

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(req: NextApiRequest, keyGenerator?: (req: NextApiRequest) => string) {
  const clientId = getClientId(req, keyGenerator);
  const entry = rateLimitStore.get(clientId);
  
  if (!entry) {
    return null;
  }
  
  const now = Date.now();
  
  return {
    count: entry.count,
    resetTime: entry.resetTime,
    isExpired: now > entry.resetTime,
    remainingTime: Math.max(0, entry.resetTime - now)
  };
}