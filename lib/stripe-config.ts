// Stripe Configuration for Test and Live Modes
// This file centralizes all Stripe-related configuration

export const STRIPE_CONFIG = {
  // Environment detection - Default to live mode in production, explicit setting in development
  isLiveMode: process.env.NODE_ENV === 'production' ? 
    (process.env.STRIPE_LIVE_MODE !== 'false') : // Default to true in production unless explicitly false
    (process.env.STRIPE_LIVE_MODE === 'true'),   // Explicit true required in development
  
  // Price IDs - Update these when switching to live mode
  prices: {
    test: {
      annual: 'price_1RgTO54CotGwBUxNPQl3SLAP',      // £1.99/year test
      annualSecondary: 'price_1RgTPb4CotGwBUxN4LVbW9vO', // Alternative annual test
      lifetime: 'price_1RgTPF4CotGwBUxNiayDAzep'    // £3.49 lifetime test
    },
    live: {
      annual: 'price_1RgVZOKPYCLDBTOzdQOeYilW',
      annualSecondary: 'price_1RgVZOKPYCLDBTOzdQOeYilW', // Same as annual for now
      lifetime: 'price_1RgVZwKPYCLDBTOzITlyzdDB'
    }
  },

  // Public keys
  publishableKeys: {
    test: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    live: process.env.NEXT_PUBLIC_STRIPE_LIVE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
  },

  // Webhook endpoints
  webhookEndpoints: {
    test: 'https://riverwalks.co.uk/api/stripe/webhook',
    live: 'https://riverwalks.co.uk/api/stripe/webhook'
  }
};

// Helper functions to get current configuration
export function getCurrentPrices() {
  return STRIPE_CONFIG.isLiveMode ? STRIPE_CONFIG.prices.live : STRIPE_CONFIG.prices.test;
}

export function getCurrentPublishableKey() {
  return STRIPE_CONFIG.isLiveMode 
    ? STRIPE_CONFIG.publishableKeys.live 
    : STRIPE_CONFIG.publishableKeys.test;
}

export function getStripeMode(): 'test' | 'live' {
  return STRIPE_CONFIG.isLiveMode ? 'live' : 'test';
}

// Validation function to ensure all required keys are present
export function validateStripeConfig(): { isValid: boolean; missingKeys: string[] } {
  const missingKeys: string[] = [];
  
  const currentPrices = getCurrentPrices();
  const currentKey = getCurrentPublishableKey();
  
  if (!currentKey) {
    missingKeys.push(`${getStripeMode()}_publishable_key`);
  }
  
  if (!currentPrices.annual || currentPrices.annual.includes('REPLACE_WITH')) {
    missingKeys.push(`${getStripeMode()}_annual_price_id`);
  }
  
  if (!currentPrices.lifetime || currentPrices.lifetime.includes('REPLACE_WITH')) {
    missingKeys.push(`${getStripeMode()}_lifetime_price_id`);
  }
  
  return {
    isValid: missingKeys.length === 0,
    missingKeys
  };
}

// Log current configuration (for debugging)
export function logStripeConfig() {
  const mode = getStripeMode();
  const config = validateStripeConfig();
  
  console.log(`🔧 Stripe Configuration (${mode.toUpperCase()} mode):`);
  console.log(`   Environment Variables:`);
  console.log(`     NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`     STRIPE_LIVE_MODE: ${process.env.STRIPE_LIVE_MODE}`);
  console.log(`     isLiveMode calculated: ${STRIPE_CONFIG.isLiveMode}`);
  console.log(`   Valid: ${config.isValid ? '✅' : '❌'}`);
  
  if (!config.isValid) {
    console.warn(`   Missing: ${config.missingKeys.join(', ')}`);
  }
  
  console.log(`   Annual Price: ${getCurrentPrices().annual}`);
  console.log(`   Lifetime Price: ${getCurrentPrices().lifetime}`);
  console.log(`   Publishable Key: ${getCurrentPublishableKey().substring(0, 12)}...`);
}