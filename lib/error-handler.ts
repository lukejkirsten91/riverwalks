import { NextApiResponse } from 'next';
import { logger } from './logger';
import { getEnvironment } from './environment';

/**
 * Error sanitization and handling utilities
 * Prevents sensitive information leakage in production
 */

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * Sanitize error for client response
 * Removes sensitive information in production
 */
export function sanitizeError(error: any): ApiError {
  const environment = getEnvironment();
  const isDevelopment = environment === 'development';
  
  // Handle AppError instances
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: isDevelopment ? error.details : undefined
    };
  }
  
  // Handle known error types
  if (error?.code === 'PGRST116') {
    // Supabase RLS policy violation
    return {
      message: 'Access denied',
      code: 'ACCESS_DENIED',
      statusCode: 403
    };
  }
  
  if (error?.code === 'PGRST301') {
    // Supabase row not found
    return {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      statusCode: 404
    };
  }
  
  if (error?.type === 'StripeInvalidRequestError') {
    return {
      message: 'Payment request invalid',
      code: 'PAYMENT_ERROR',
      statusCode: 400,
      details: isDevelopment ? error.message : undefined
    };
  }
  
  if (error?.type === 'StripeCardError') {
    return {
      message: error.message || 'Payment failed',
      code: 'CARD_ERROR',
      statusCode: 400
    };
  }
  
  // Handle HTTP status codes
  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode;
    
    const statusMessages: { [key: number]: string } = {
      400: 'Bad request',
      401: 'Authentication required',
      403: 'Access denied',
      404: 'Resource not found',
      409: 'Conflict',
      422: 'Validation failed',
      429: 'Too many requests',
      500: 'Internal server error',
      502: 'Service unavailable',
      503: 'Service temporarily unavailable'
    };
    
    return {
      message: statusMessages[status] || 'An error occurred',
      statusCode: status,
      details: isDevelopment ? error.message : undefined
    };
  }
  
  // Handle validation errors
  if (error?.name === 'ValidationError' || error?.errors) {
    return {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: isDevelopment ? error.errors || error.message : undefined
    };
  }
  
  // Default error handling
  const isNetworkError = error?.code === 'ECONNREFUSED' || 
                         error?.code === 'ENOTFOUND' ||
                         error?.code === 'ETIMEDOUT';
  
  if (isNetworkError) {
    return {
      message: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      statusCode: 503
    };
  }
  
  // Generic error - sanitize for production
  return {
    message: isDevelopment ? 
      (error?.message || 'An error occurred') : 
      'An unexpected error occurred',
    statusCode: 500,
    details: isDevelopment ? {
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    } : undefined
  };
}

/**
 * Send error response with proper sanitization
 */
export function sendErrorResponse(
  res: NextApiResponse, 
  error: any, 
  requestId?: string
): void {
  const sanitized = sanitizeError(error);
  
  // Log the error with full details for debugging
  logger.error('API Error', {
    message: error?.message || 'Unknown error',
    stack: error?.stack,
    code: error?.code,
    statusCode: sanitized.statusCode,
    requestId,
    sanitizedMessage: sanitized.message
  });
  
  // Send sanitized response to client
  res.status(sanitized.statusCode).json({
    error: sanitized.message,
    code: sanitized.code,
    requestId,
    ...(sanitized.details && { details: sanitized.details })
  });
}

/**
 * Async error handler wrapper for API routes
 */
export function withErrorHandler(
  handler: (req: any, res: NextApiResponse) => Promise<void>
) {
  return async (req: any, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      sendErrorResponse(res, error);
    }
  };
}

/**
 * Common error constructors
 */
export const errors = {
  badRequest: (message: string, details?: any) => 
    new AppError(message, 400, 'BAD_REQUEST', details),
    
  unauthorized: (message: string = 'Authentication required') => 
    new AppError(message, 401, 'UNAUTHORIZED'),
    
  forbidden: (message: string = 'Access denied') => 
    new AppError(message, 403, 'FORBIDDEN'),
    
  notFound: (message: string = 'Resource not found') => 
    new AppError(message, 404, 'NOT_FOUND'),
    
  conflict: (message: string, details?: any) => 
    new AppError(message, 409, 'CONFLICT', details),
    
  validation: (message: string, details?: any) => 
    new AppError(message, 422, 'VALIDATION_ERROR', details),
    
  tooManyRequests: (message: string = 'Too many requests') => 
    new AppError(message, 429, 'TOO_MANY_REQUESTS'),
    
  internal: (message: string = 'Internal server error', details?: any) => 
    new AppError(message, 500, 'INTERNAL_ERROR', details),
    
  serviceUnavailable: (message: string = 'Service temporarily unavailable') => 
    new AppError(message, 503, 'SERVICE_UNAVAILABLE')
};

/**
 * Validate required fields and throw error if missing
 */
export function requireFields(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw errors.validation(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}