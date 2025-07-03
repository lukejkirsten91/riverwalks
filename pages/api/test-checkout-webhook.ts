import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Create service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    console.log('🧪 Testing checkout completion for session:', sessionId);

    // Get the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    console.log('✅ Retrieved session:', {
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_details?.email
    });

    // Simulate the webhook handler logic
    const result = await handleCheckoutCompleted(session);

    return res.status(200).json({
      success: true,
      message: 'Checkout completion test successful',
      result
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    return res.status(500).json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🎉 Testing checkout completed:', session.id);
  
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
    
    console.log('👥 Found users:', user?.users?.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    })));
    
    const foundUser = user?.users.find(u => u.email === customerEmail);
    
    if (!foundUser) {
      console.error('❌ User not found:', customerEmail);
      throw new Error(`User not found for email: ${customerEmail}`);
    }
    
    console.log('✅ Found user:', { id: foundUser.id, email: foundUser.email });

    // Get line items and determine subscription type
    console.log('💰 Getting line items for session:', session.id);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const priceId = lineItems.data[0]?.price?.id;
    
    console.log('🏷️ Price ID:', priceId);
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

    // Create subscription record
    console.log('💾 Creating subscription record for user:', foundUser.id);
    const { data: subscription, error: subError } = await supabaseAdmin
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
      })
      .select();

    if (subError) {
      console.error('❌ Subscription creation error:', subError);
      throw subError;
    }

    console.log(`✅ Subscription created for ${customerEmail}: ${subscriptionType}`);
    console.log('📝 Created subscription:', subscription);
    
    return {
      user: { id: foundUser.id, email: foundUser.email },
      subscription: subscription?.[0],
      subscriptionType,
      priceId
    };
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
    throw error;
  }
}