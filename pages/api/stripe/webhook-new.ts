import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

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
  console.log('🔗 New webhook called:', {
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
        console.log('💰 Payment succeeded:', (event.data.object as Stripe.PaymentIntent).id);
        break;
      
      case 'payment_intent.payment_failed':
        console.log('❌ Payment failed:', (event.data.object as Stripe.PaymentIntent).id);
        break;
      
      default:
        console.log(`🔄 Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully:', event.type);
    return res.status(200).json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Webhook handler failed',
      details: error instanceof Error ? error.message : 'Unknown error'
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

    console.log('🔍 Looking for user with email:', customerEmail);
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      throw new Error(`Error listing users: ${userError.message}`);
    }
    
    const foundUser = user?.users.find(u => u.email === customerEmail);
    
    if (!foundUser) {
      console.error('❌ User not found:', customerEmail);
      throw new Error(`User not found for email: ${customerEmail}`);
    }
    
    console.log('✅ Found user:', { id: foundUser.id, email: foundUser.email });

    // Get line items and determine subscription type
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    console.log('🏷️ Price ID:', priceId);
    
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

    console.log(`✅ Subscription created for ${customerEmail}: ${subscriptionType}`);
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
    throw error;
  }
}