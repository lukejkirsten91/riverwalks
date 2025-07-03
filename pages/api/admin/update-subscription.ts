import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
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
    // Verify admin access from request headers
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(403).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.email !== 'luke.kirsten@gmail.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { userId, subscriptionType } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // If subscriptionType is null, remove the subscription (make user free)
    if (subscriptionType === null) {
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing subscription:', error);
        return res.status(500).json({ error: 'Failed to remove subscription' });
      }

      return res.status(200).json({ message: 'Subscription removed successfully' });
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    const subscriptionData = {
      user_id: userId,
      subscription_type: subscriptionType,
      status: 'active',
      stripe_customer_id: existingSubscription?.stripe_customer_id || null,
      stripe_price_id: existingSubscription?.stripe_price_id || null,
      current_period_start: new Date(),
      current_period_end: subscriptionType === 'lifetime' 
        ? new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      updated_at: new Date(),
    };

    let result;
    if (existingSubscription) {
      // Update existing subscription
      result = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('user_id', userId);
    } else {
      // Create new subscription
      result = await supabaseAdmin
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date(),
        });
    }

    if (result.error) {
      console.error('Error updating subscription:', result.error);
      return res.status(500).json({ error: 'Failed to update subscription' });
    }

    return res.status(200).json({ 
      message: `Subscription updated to ${subscriptionType} successfully` 
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}