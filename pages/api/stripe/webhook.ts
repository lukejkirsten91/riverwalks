import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

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
  console.log('🔗 Webhook called:', {
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers),
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    console.log('❌ Wrong method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  
  if (!sig) {
    console.error('❌ Missing Stripe signature');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    const buf = await buffer(req);
    console.log('📦 Buffer received, length:', buf.length);
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type, 'ID:', event.id);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
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
        console.log(`🔄 Unhandled event type: ${event.type}`);
    }

    // Log the event for debugging
    await logPaymentEvent(event);

    console.log('✅ Webhook processed successfully:', event.type);
    return res.status(200).json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    
    let errorDetails = 'Unknown error';
    let errorType = typeof error;
    
    if (error instanceof Error) {
      errorDetails = error.message;
      console.error('❌ Error stack:', error.stack);
    } else if (error && typeof error === 'object') {
      try {
        errorDetails = JSON.stringify(error);
      } catch (stringifyError) {
        errorDetails = error.toString();
      }
    } else {
      errorDetails = String(error);
    }
    
    console.error('❌ Error details:', {
      details: errorDetails,
      type: errorType,
      originalError: error
    });
    
    return res.status(500).json({ 
      error: 'Webhook handler failed',
      details: errorDetails,
      type: errorType,
      timestamp: new Date().toISOString()
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout completed:', session.id);
  
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error('No customer email found in session');
    }

    // Get user by email using service role client
    console.log('🔍 Looking for user with email:', customerEmail);
    
    if (!supabaseAdmin) {
      throw new Error('Supabase service role client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      throw new Error(`Error listing users: ${userError.message}`);
    }
    
    console.log('👥 Found users:', user?.users?.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    })));
    
    const foundUser = user?.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
    
    if (!foundUser) {
      console.error('❌ User not found. Available users:', user?.users?.map(u => u.email));
      throw new Error(`User not found for email: ${customerEmail}. Available users: ${user?.users?.map(u => u.email).join(', ')}`);
    }
    
    console.log('✅ Found user:', { id: foundUser.id, email: foundUser.email });

    // Determine subscription type from price ID
    console.log('💰 Getting line items for session:', session.id);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    console.log('🏷️ Price ID from session:', priceId);
    console.log('📋 Line items:', lineItems.data.map(item => ({
      price_id: item.price?.id,
      description: item.description,
      amount_total: item.amount_total
    })));
    
    let subscriptionType: 'annual' | 'lifetime';
    if (priceId === 'price_1RgTO54CotGwBUxNPQl3SLAP' || priceId === 'price_1RgTPb4CotGwBUxN4LVbW9vO') {
      subscriptionType = 'annual';
      console.log('✅ Detected annual subscription');
    } else if (priceId === 'price_1RgTPF4CotGwBUxNiayDAzep') {
      subscriptionType = 'lifetime';
      console.log('✅ Detected lifetime subscription');
    } else {
      console.error('❌ Unknown price ID:', priceId);
      throw new Error(`Unknown price ID: ${priceId}`);
    }

    // Create subscription record using service role client
    console.log('💾 Creating subscription record for user:', foundUser.id);
    
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
      console.log('📝 Updating existing subscription');
      const result = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', foundUser.id);
      subError = result.error;
    } else {
      // Create new subscription
      console.log('➕ Creating new subscription');
      const result = await supabaseAdmin
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date(),
        });
      subError = result.error;
    }

    if (subError) {
      console.error('❌ Subscription operation failed:', subError);
      throw subError;
    }

    console.log(`✅ Subscription created for ${customerEmail}: ${subscriptionType}`);
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Payment succeeded:', paymentIntent.id);
  // Additional logic if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Payment failed:', paymentIntent.id);
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

      console.log('📝 Payment event logged:', event.type);
    }
  } catch (error) {
    console.error('❌ Error logging payment event:', error);
  }
}