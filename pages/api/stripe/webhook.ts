import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getCurrentPrices, getStripeMode } from '../../../lib/stripe-config';
import { logger } from '../../../lib/logger';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

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
  logger.info('Stripe webhook called', {
    method: req.method,
    endpoint: 'webhook',
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    logger.warn('Invalid HTTP method for webhook', { method: req.method });
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    logger.error('Missing Stripe signature in webhook request');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    logger.info('Stripe webhook signature verified', { eventType: event.type, eventId: event.id });
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', { error: err instanceof Error ? err.message : 'Unknown error' });
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
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      default:
        logger.info('Unhandled Stripe event type', { eventType: event.type });
    }

    // Log the event for debugging
    await logPaymentEvent(event);

    logger.info('Stripe webhook processed successfully', { eventType: event.type, eventId: event.id });
    return res.status(200).json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Stripe webhook handler error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // TEMPORARY DEBUG: Also log to console for immediate debugging
    console.error('🚨 WEBHOOK DEBUG - Error details:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      eventType: event?.type,
      eventId: event?.id,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.info('Stripe checkout completed', { sessionId: session.id });
  
  // TEMPORARY DEBUG: Add console logging for immediate debugging
  console.log('🎉 WEBHOOK DEBUG - Checkout completed:', {
    sessionId: session.id,
    customerEmail: session.customer_details?.email,
    paymentStatus: session.payment_status,
    timestamp: new Date().toISOString()
  });
  
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error('No customer email found in session');
    }

    // Get user by email using service role client
    logger.info('Looking up user for checkout completion');
    
    if (!supabaseAdmin) {
      throw new Error('Supabase service role client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      logger.error('Error listing users during checkout', { error: userError.message });
      throw new Error(`Error listing users: ${userError.message}`);
    }
    
    logger.debug('User lookup completed', { userCount: user?.users?.length });
    
    const foundUser = user?.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
    
    if (!foundUser) {
      logger.error('User not found for checkout completion');
      throw new Error(`User not found for checkout email`);
    }
    
    logger.info('User found for subscription creation');

    // Determine subscription type from price ID using centralized config
    logger.info('Processing checkout line items');
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    logger.debug('Checkout pricing details', { 
      priceId, 
      stripeMode: getStripeMode(),
      itemCount: lineItems.data.length
    });
    
    // Get current price configuration
    const currentPrices = getCurrentPrices();
    
    let subscriptionType: 'annual' | 'lifetime';
    if (priceId === currentPrices.annual || priceId === currentPrices.annualSecondary) {
      subscriptionType = 'annual';
      logger.info('Detected annual subscription type');
    } else if (priceId === currentPrices.lifetime) {
      subscriptionType = 'lifetime';
      logger.info('Detected lifetime subscription type');
    } else {
      logger.error('Unknown price ID in checkout', { priceId, stripeMode: getStripeMode() });
      throw new Error(`Unknown price ID: ${priceId} (mode: ${getStripeMode()})`);
    }

    // Create subscription record using service role client
    logger.info('Creating subscription record', { subscriptionType });
    
    if (!supabaseAdmin) {
      throw new Error('Supabase service role client not configured');
    }

    // First check if user already has a subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('id')
      .eq('user_id', foundUser.id)
      .single();

    const subscriptionData = {
      user_id: foundUser.id,
      subscription_type: subscriptionType,
      status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_price_id: priceId,
      current_period_start: new Date(),
      current_period_end: subscriptionType === 'lifetime' 
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      updated_at: new Date(),
    };

    let subError;
    if (existingSubscription) {
      // Update existing subscription
      logger.info('Updating existing subscription');
      const result = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', foundUser.id);
      subError = result.error;
    } else {
      // Create new subscription
      logger.info('Creating new subscription');
      const result = await supabaseAdmin
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date(),
        });
      subError = result.error;
    }

    if (subError) {
      logger.error('Subscription operation failed', { error: subError.message });
      throw subError;
    }

    logger.info('Subscription operation completed', { subscriptionType });
  } catch (error) {
    logger.error('Error handling checkout completion', { error: error instanceof Error ? error.message : 'Unknown error' });
    
    // TEMPORARY DEBUG: Add console logging for checkout errors
    console.error('🚨 WEBHOOK DEBUG - Checkout completion error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      sessionId: session.id,
      customerEmail: session.customer_details?.email,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info('Stripe payment succeeded', { paymentIntentId: paymentIntent.id });
  // Additional logic if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  logger.warn('Stripe payment failed', { paymentIntentId: paymentIntent.id });
  // Additional logic if needed
}

async function logPaymentEvent(event: Stripe.Event) {
  try {
    // Find user if possible
    let userId = null;
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      
      if (customerEmail && supabaseAdmin) {
        const { data: user } = await supabaseAdmin.auth.admin.listUsers();
        const foundUser = user?.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
        userId = foundUser?.id || null;
      }
    }

    if (supabaseAdmin) {
      await supabaseAdmin
        .from('payment_events')
        .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        user_id: userId,
        data: event.data,
        processed_at: new Date(),
        });

      logger.info('Payment event logged', { eventType: event.type });
    }
  } catch (error) {
    logger.error('Error logging payment event', { error: error instanceof Error ? error.message : 'Unknown error' });
  }
}