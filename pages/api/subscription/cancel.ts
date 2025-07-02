import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient<Database>({ req, res });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { immediate = false } = req.body;

    // Get user's active subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    if (subscription.plan_type === 'lifetime') {
      return res.status(400).json({ 
        error: 'Lifetime subscriptions cannot be canceled. Please contact support for refund requests.' 
      });
    }

    if (!subscription.stripe_subscription_id) {
      return res.status(400).json({ error: 'No Stripe subscription ID found' });
    }

    try {
      if (immediate) {
        // Cancel immediately
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
        
        // Update database immediately
        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        res.status(200).json({ 
          message: 'Subscription canceled immediately',
          canceledAt: new Date().toISOString(),
          accessUntil: null,
        });
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Note: We don't update the database status here as the subscription
        // is still active until the period ends. The webhook will handle the final cancellation.

        res.status(200).json({ 
          message: 'Subscription will be canceled at the end of the current period',
          canceledAt: null,
          accessUntil: subscription.current_period_end,
        });
      }
    } catch (stripeError: any) {
      console.error('Stripe cancellation error:', stripeError);
      return res.status(500).json({ 
        error: 'Failed to cancel subscription with Stripe',
        details: stripeError.message 
      });
    }

  } catch (error) {
    console.error('Error in subscription cancellation endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}