import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { trackPurchase } from '../../../lib/analytics';
import { logger } from '../../../lib/logger';

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.info('Stripe webhook received', {
    method: req.method,
    url: req.url?.substring(0, 50)
  });

  if (req.method !== 'POST') {
    logger.warn('Invalid webhook method', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    logger.error('Missing Stripe signature header');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    logger.debug('Webhook payload received', { bufferLength: buf.length });
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    logger.info('Webhook signature verified', { eventType: event.type });
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err instanceof Error ? err.message : 'Unknown error' });
    return res.status(400).json({ 
      error: 'Webhook signature verification failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        logger.info('Payment succeeded');
        break;
      
      case 'payment_intent.payment_failed':
        logger.warn('Payment failed');
        break;
      
      default:
        logger.debug('Unhandled webhook event type', { eventType: event.type });
    }

    logger.info('Webhook processed successfully', { eventType: event.type });
    return res.status(200).json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Webhook handler error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return res.status(500).json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('Processing checkout completion');
  
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error('No customer email found in session');
    }

    logger.info('Looking up user from checkout');
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      logger.error('Error listing users', { error: userError.message });
      throw new Error(`Error listing users: ${userError.message}`);
    }
    
    const foundUser = user?.users.find(u => u.email === customerEmail);
    
    if (!foundUser) {
      logger.error('User not found for checkout');
      throw new Error(`User not found for email: ${customerEmail}`);
    }
    
    logger.info('User found for checkout');

    // Get line items and determine subscription type
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    logger.debug('Processing subscription', { subscriptionType });
    
    let subscriptionType: 'annual' | 'lifetime';
    if (priceId === 'price_1RgTO54CotGwBUxNPQl3SLAP') {
      subscriptionType = 'annual';
    } else if (priceId === 'price_1RgTPF4CotGwBUxNiayDAzep') {
      subscriptionType = 'lifetime';
    } else {
      throw new Error(`Unknown price ID: ${priceId}`);
    }

    // Create subscription record
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: foundUser.id,
        subscription_type: subscriptionType,
        status: 'active',
        stripe_customer_id: session.customer as string,
        stripe_price_id: priceId,
        current_period_start: new Date(),
        current_period_end: subscriptionType === 'lifetime' 
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        created_at: new Date(),
        updated_at: new Date(),
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      throw subError;
    }

    logger.info('Subscription created successfully', { subscriptionType });
    
    // Track purchase in Google Analytics
    const amount = session.amount_total ? session.amount_total / 100 : 0; // Convert from cents
    trackPurchase(
      session.id,
      amount,
      session.currency?.toUpperCase() || 'GBP'
    );
    
    logger.info('Purchase tracked in analytics', { amount, currency: session.currency?.toUpperCase() });
  } catch (error) {
    logger.error('Error handling checkout completion', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw error;
  }
}