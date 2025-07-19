import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';
import { getEnvironment, getBaseUrl } from './environment';

/**
 * Secure CORS configuration for Riverwalks
 * Replaces wildcard CORS with specific allowed origins
 */

// Define allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const environment = getEnvironment();
  const baseUrl = getBaseUrl();
  
  // Always include the current environment's base URL
  const origins = [baseUrl];
  
  switch (environment) {
    case 'development':
      origins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://riverwalks.co.uk',
        'https://www.riverwalks.co.uk'
      );
      break;
      
    case 'staging':
      origins.push(
        'http://localhost:3000', // For local testing against staging
        'https://riverwalks-staging.vercel.app',
        'https://riverwalks.co.uk' // In case staging needs to test against prod APIs
      );
      break;
      
    case 'production':
      origins.push(
        'https://riverwalks.co.uk',
        'https://www.riverwalks.co.uk'
      );
      break;
  }
  
  // Add any custom origins from environment variables
  const customOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  origins.push(...customOrigins);
  
  // Remove duplicates and filter out empty strings
  return [...new Set(origins)].filter(Boolean);
};

/**
 * Set secure CORS headers for API responses
 * @param req - Next.js API request
 * @param res - Next.js API response  
 * @param options - Additional CORS options
 */
export function setCorsHeaders(
  req: NextApiRequest, 
  res: NextApiResponse,
  options: {
    allowCredentials?: boolean;
    maxAge?: number;
    methods?: string[];
  } = {}
): boolean {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  // Check if origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    logger.debug('CORS origin allowed', { origin });
  } else {
    // For same-origin requests (no origin header), allow if it's from our domain
    const referer = req.headers.referer;
    const isFromAllowedDomain = referer && allowedOrigins.some(allowed => 
      referer.startsWith(allowed)
    );
    
    if (isFromAllowedDomain) {
      // Extract origin from referer
      const refererOrigin = new URL(referer).origin;
      res.setHeader('Access-Control-Allow-Origin', refererOrigin);
      logger.debug('CORS origin allowed from referer', { refererOrigin });
    } else {
      logger.warn('CORS origin rejected', { 
        origin, 
        referer, 
        userAgent: req.headers['user-agent']?.substring(0, 100) 
      });
      return false;
    }
  }
  
  // Set other CORS headers
  const {
    allowCredentials = true,
    maxAge = 86400, // 24 hours
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  } = options;
  
  if (allowCredentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', maxAge.toString());
  
  return true;
}

/**
 * Handle CORS preflight requests
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @returns boolean - Whether this was a preflight request
 */
export function handleCorsPrelight(req: NextApiRequest, res: NextApiResponse): boolean {
  if (req.method === 'OPTIONS') {
    const corsAllowed = setCorsHeaders(req, res);
    
    if (corsAllowed) {
      res.status(200).end();
    } else {
      res.status(403).json({ error: 'CORS policy violation' });
    }
    
    return true;
  }
  
  return false;
}

/**
 * Complete CORS middleware for API routes
 * Handles both preflight and actual requests
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @returns boolean - Whether the request should continue
 */
export function corsMiddleware(req: NextApiRequest, res: NextApiResponse): boolean {
  // Handle preflight request
  if (handleCorsPrelight(req, res)) {
    return false; // Request handled, don't continue
  }
  
  // Set CORS headers for actual request
  const corsAllowed = setCorsHeaders(req, res);
  
  if (!corsAllowed) {
    res.status(403).json({ error: 'CORS policy violation' });
    return false;
  }
  
  return true; // Request can continue
}