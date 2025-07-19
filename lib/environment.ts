/**
 * Environment configuration and detection utilities
 * Helps manage different deployment environments safely
 */

export type Environment = 'development' | 'staging' | 'production';

/**
 * Get the current environment
 */
export function getEnvironment(): Environment {
  // Check explicit environment variable first
  const explicitEnv = process.env.NEXT_PUBLIC_ENVIRONMENT;
  if (explicitEnv === 'staging' || explicitEnv === 'production') {
    return explicitEnv;
  }

  // Fallback to NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  }

  // Check Vercel environment
  if (process.env.VERCEL_ENV) {
    switch (process.env.VERCEL_ENV) {
      case 'development':
        return 'development';
      case 'preview':
        return 'staging';
      case 'production':
        return 'production';
      default:
        return 'staging';
    }
  }

  // Default to production for safety
  return 'production';
}

/**
 * Check if we're in a specific environment
 */
export const isEnvironment = {
  development: () => getEnvironment() === 'development',
  staging: () => getEnvironment() === 'staging',
  production: () => getEnvironment() === 'production'
};

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const env = getEnvironment();
  
  return {
    environment: env,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
    
    // Logging configuration
    logging: {
      level: env === 'development' ? 'debug' : 'info',
      enableConsole: env === 'development',
      enableStructured: env !== 'development'
    },
    
    // Security configuration
    security: {
      enableCORS: true,
      strictCSP: env === 'production',
      enableRateLimit: env !== 'development'
    },
    
    // Features configuration
    features: {
      enableAnalytics: env === 'production',
      enableErrorReporting: env !== 'development',
      enablePerformanceMonitoring: true
    },
    
    // Database configuration
    database: {
      enableRowLevelSecurity: true,
      enableAuditLogs: env !== 'development'
    }
  };
}

/**
 * Get the current domain/base URL
 */
export function getBaseUrl(): string {
  // Check for Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Check for custom domain
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  // Environment-specific defaults
  const env = getEnvironment();
  switch (env) {
    case 'development':
      return 'http://localhost:3000';
    case 'staging':
      return 'https://riverwalks-staging.vercel.app';
    case 'production':
      return 'https://riverwalks.co.uk';
    default:
      return 'https://riverwalks.co.uk';
  }
}

/**
 * Environment-aware feature flags
 */
export const featureFlags = {
  // Only enable certain features in specific environments
  enableAdminPanel: () => !isEnvironment.production() || process.env.ENABLE_ADMIN_PANEL === 'true',
  enableDebugMode: () => isEnvironment.development() || process.env.ENABLE_DEBUG === 'true',
  enableTestData: () => !isEnvironment.production(),
  enableMaintenanceMode: () => process.env.MAINTENANCE_MODE === 'true'
};

/**
 * Get environment display info (for UI)
 */
export function getEnvironmentInfo() {
  const env = getEnvironment();
  
  const info = {
    development: {
      name: 'Development',
      color: 'blue',
      show: true
    },
    staging: {
      name: 'Staging',
      color: 'orange', 
      show: true
    },
    production: {
      name: 'Production',
      color: 'green',
      show: false // Don't show environment badge in production
    }
  };
  
  return info[env];
}