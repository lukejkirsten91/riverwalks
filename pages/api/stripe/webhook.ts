import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
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
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
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

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Checkout completed:', session.id);
  
  try {
    const customerEmail = session.customer_details?.email;
    if (!customerEmail) {
      throw new Error('No customer email found in session');
    }

    // Get user by email
    const { data: user, error: userError } = await supabase.auth.admin.listUsers();
    const foundUser = user?.users.find(u => u.email === customerEmail);
    
    if (!foundUser) {
      throw new Error(`User not found for email: ${customerEmail}`);
    }

    // Determine subscription type from price ID
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    let subscriptionType: 'annual' | 'lifetime';
    if (priceId === 'price_1RgTO54CotGwBUxNPQl3SLAP') {
      subscriptionType = 'annual';
    } else if (priceId === 'price_1RgTPF4CotGwBUxNiayDAzep') {
      subscriptionType = 'lifetime';
    } else {
      throw new Error(`Unknown price ID: ${priceId}`);
    }

    // Create subscription record
    const { error: subError } = await supabase
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
      
      if (customerEmail) {
        const { data: user } = await supabase.auth.admin.listUsers();
        const foundUser = user?.users.find(u => u.email === customerEmail);
        userId = foundUser?.id || null;
      }
    }

    await supabase
      .from('payment_events')
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        user_id: userId,
        data: event.data,
        processed_at: new Date(),
      });

    console.log('📝 Payment event logged:', event.type);
  } catch (error) {
    console.error('❌ Error logging payment event:', error);
  }
}