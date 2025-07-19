/**
 * Secure logging system for Riverwalks
 * Prevents sensitive data exposure in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class SecureLogger {
  private isDevelopment: boolean;
  private sensitiveKeys = new Set([
    'password', 'token', 'secret', 'key', 'auth', 'credential',
    'stripe', 'payment', 'card', 'email', 'user_id', 'customer_id',
    'session', 'cookie', 'jwt', 'api_key'
  ]);

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Sanitize potential sensitive strings
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = this.sensitiveKeys.has(lowerKey) || 
                           lowerKey.includes('password') || 
                           lowerKey.includes('secret') ||
                           lowerKey.includes('token') ||
                           lowerKey.includes('key');
        
        if (isSensitive) {
          sanitized[key] = this.maskSensitiveValue(value);
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  private sanitizeString(str: string): string {
    // Mask email addresses in production
    if (!this.isDevelopment && str.includes('@')) {
      return str.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@***.***');
    }
    
    // Mask potential tokens/keys
    if (!this.isDevelopment && (str.startsWith('sk_') || str.startsWith('pk_') || str.length > 20)) {
      return str.substring(0, 8) + '...';
    }

    return str;
  }

  private maskSensitiveValue(value: any): string {
    if (typeof value === 'string' && value.length > 0) {
      return value.substring(0, 4) + '...';
    }
    return '[REDACTED]';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitizeData(context) : undefined;
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(sanitizedContext && { context: sanitizedContext })
    };

    // In development, use pretty formatting
    if (this.isDevelopment) {
      const emoji = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌'
      }[level];

      console[level === 'debug' ? 'log' : level](`${emoji} ${message}`, sanitizedContext || '');
    } else {
      // In production, use structured JSON logging
      console[level === 'debug' ? 'log' : level](JSON.stringify(logEntry));
    }
  }

  debug(message: string, context?: LogContext): void {
    this.formatMessage('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.formatMessage('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatMessage('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatMessage('error', message, context);
  }

  // Special methods for common use cases
  apiRequest(method: string, endpoint: string, userId?: string): void {
    this.info('API Request', {
      method,
      endpoint,
      user_id: userId ? this.maskSensitiveValue(userId) : undefined
    });
  }

  authEvent(event: string, userEmail?: string): void {
    this.info('Auth Event', {
      event,
      email: userEmail ? this.sanitizeString(userEmail) : undefined
    });
  }

  paymentEvent(event: string, amount?: number, currency?: string): void {
    this.info('Payment Event', {
      event,
      amount,
      currency
    });
  }

  performanceMetric(metric: string, value: number, unit: string): void {
    this.debug('Performance Metric', {
      metric,
      value,
      unit
    });
  }
}

// Export singleton instance
export const logger = new SecureLogger();

// Legacy console replacement functions for gradual migration
export const secureLog = {
  log: (message: string, context?: LogContext) => logger.info(message, context),
  error: (message: string, context?: LogContext) => logger.error(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  debug: (message: string, context?: LogContext) => logger.debug(message, context)
};