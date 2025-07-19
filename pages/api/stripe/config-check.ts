import { NextApiRequest, NextApiResponse } from 'next';
import { validateStripeConfig, getCurrentPrices, getStripeMode, getCurrentPublishableKey } from '../../../lib/stripe-config';
import { logger } from '../../../lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const mode = getStripeMode();
    const config = validateStripeConfig();
    const prices = getCurrentPrices();
    const publishableKey = getCurrentPublishableKey();

    // Basic environment check
    const envCheck = {
      nodeEnv: process.env.NODE_ENV,
      stripeLiveMode: process.env.STRIPE_LIVE_MODE,
      hasPublishableKey: !!publishableKey,
      hasSecretKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Price configuration check
    const priceCheck = {
      annual: {
        configured: !!prices.annual && !prices.annual.includes('REPLACE_WITH'),
        priceId: prices.annual.substring(0, 20) + '...',
        isTest: prices.annual.startsWith('price_1') && !prices.annual.includes('live')
      },
      lifetime: {
        configured: !!prices.lifetime && !prices.lifetime.includes('REPLACE_WITH'),
        priceId: prices.lifetime.substring(0, 20) + '...',
        isTest: prices.lifetime.startsWith('price_1') && !prices.lifetime.includes('live')
      }
    };

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      stripeMode: mode,
      configuration: {
        isValid: config.isValid,
        missingKeys: config.missingKeys,
        environment: envCheck,
        prices: priceCheck
      },
      readiness: {
        canProcessPayments: config.isValid && envCheck.hasSecretKey && envCheck.hasWebhookSecret,
        canHandleWebhooks: envCheck.hasWebhookSecret && envCheck.hasSupabaseServiceKey,
        isProductionReady: mode === 'live' && config.isValid && !priceCheck.annual.isTest
      }
    };

    // Log configuration status
    logger.info('Stripe Configuration Check', { stripeMode: mode.toUpperCase() });
    logger.info('Stripe config validation', { isValid: config.isValid });
    logger.info('Payment processing capability', { canProcessPayments: response.readiness.canProcessPayments });
    logger.info('Production readiness', { isProductionReady: response.readiness.isProductionReady });

    res.status(200).json(response);

  } catch (error) {
    logger.error('Stripe configuration check failed', { 
      errorMessage: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      success: false,
      error: 'Configuration check failed',
      timestamp: new Date().toISOString()
    });
  }
}

// This endpoint helps validate Stripe configuration before going live
export const config = {
  api: {
    bodyParser: false,
  },
};