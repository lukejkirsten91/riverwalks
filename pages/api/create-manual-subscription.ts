import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations (bypass RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Service role not configured' });
    }

    const { email, subscriptionType = 'lifetime' } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('🔍 Creating manual subscription for:', email);

    // Find the user
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('❌ Error listing users:', userError);
      return res.status(500).json({ error: 'Failed to list users', details: userError.message });
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ User not found:', email);
      return res.status(404).json({ 
        error: 'User not found', 
        availableUsers: users.users.map(u => u.email) 
      });
    }

    console.log('✅ Found user:', { id: user.id, email: user.email });

    // Create subscription using service role (bypasses RLS)
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        subscription_type: subscriptionType,
        status: 'active',
        stripe_customer_id: null,
        stripe_price_id: subscriptionType === 'lifetime' ? 'price_1RgTPF4CotGwBUxNiayDAzep' : 'price_1RgTO54CotGwBUxNPQl3SLAP',
        current_period_start: new Date(),
        current_period_end: subscriptionType === 'lifetime' 
          ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        created_at: new Date(),
      }, {
        onConflict: 'user_id'
      });

    if (subError) {
      console.error('❌ Error creating subscription:', subError);
      return res.status(500).json({ error: 'Failed to create subscription', details: subError.message });
    }

    console.log('✅ Subscription created successfully');

    return res.status(200).json({
      success: true,
      message: `${subscriptionType} subscription created for ${email}`,
      subscription: subscription
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}