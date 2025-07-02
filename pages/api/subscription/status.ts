import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient<Database>({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's subscription status using the RPC function
    const { data: subscriptionStatus, error } = await supabase
      .rpc('get_user_subscription_status', { user_uuid: user.id })
      .single();

    if (error) {
      console.error('Error fetching subscription status:', error);
      return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }

    // Get detailed subscription info if user has one
    let subscriptionDetails = null;
    if (subscriptionStatus.has_subscription) {
      const { data: details } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();
      
      subscriptionDetails = details;
    }

    res.status(200).json({
      hasSubscription: subscriptionStatus.has_subscription,
      planType: subscriptionStatus.plan_type,
      status: subscriptionStatus.status,
      expiresAt: subscriptionStatus.expires_at,
      isTrial: subscriptionStatus.is_trial,
      subscriptionDetails,
    });

  } catch (error) {
    console.error('Error in subscription status endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}