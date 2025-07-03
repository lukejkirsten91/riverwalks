import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({
    message: 'Webhook Debug Info',
    timestamp: new Date().toISOString(),
    environment: {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      stripeSecretPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 8) || 'missing',
      webhookSecretPrefix: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 8) || 'missing',
      serviceRolePrefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 8) || 'missing',
      nodeEnv: process.env.NODE_ENV,
    },
    endpoints: {
      current: '/api/stripe/webhook',
      test: '/api/stripe/webhook-test',
      debug: '/api/debug-webhook'
    },
    instructions: {
      stripe: 'Check Stripe Dashboard → Webhooks → your endpoint URL',
      vercel: 'Check Vercel → Project → Settings → Environment Variables',
      requiredEvents: ['checkout.session.completed', 'payment_intent.succeeded']
    }
  });
}