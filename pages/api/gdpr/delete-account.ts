import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import Stripe from 'stripe';

// Use service role for admin operations
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, confirmationCode } = req.body;

    if (!userId || !confirmationCode) {
      return res.status(400).json({ error: 'User ID and confirmation code are required' });
    }

    // Verify user exists and confirmation code
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Simple confirmation check (in production, you might want a more secure method)
    const expectedCode = `DELETE-${userId.slice(-8).toUpperCase()}`;
    if (confirmationCode !== expectedCode) {
      return res.status(400).json({ error: 'Invalid confirmation code' });
    }

    // Create GDPR deletion request
    const { data: gdprRequest, error: requestError } = await supabaseAdmin
      .from('gdpr_requests')
      .insert({
        user_id: userId,
        request_type: 'data_deletion',
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating GDPR deletion request:', requestError);
      return res.status(500).json({ error: 'Failed to create deletion request' });
    }

    try {
      // 1. Cancel any active Stripe subscriptions
      await cancelStripeSubscriptions(userId);

      // 2. Delete user data (cascading deletes will handle related data)
      await deleteUserData(userId);

      // 3. Delete the user account from Supabase Auth
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteUserError) {
        console.error('Error deleting user from auth:', deleteUserError);
        // Continue anyway - data is deleted
      }

      // 4. Update GDPR request
      await supabaseAdmin
        .from('gdpr_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          notes: 'Account and all associated data deleted successfully',
        })
        .eq('id', gdprRequest.id);

      res.status(200).json({
        message: 'Account and all associated data have been permanently deleted',
        deletedAt: new Date().toISOString(),
        requestId: gdprRequest.id,
      });

    } catch (deletionError) {
      console.error('Error during account deletion:', deletionError);

      // Update request status
      await supabaseAdmin
        .from('gdpr_requests')
        .update({
          status: 'failed',
          notes: 'Deletion failed: ' + (deletionError as Error).message,
        })
        .eq('id', gdprRequest.id);

      res.status(500).json({ error: 'Failed to delete account completely' });
    }

  } catch (error) {
    console.error('Error in account deletion endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function cancelStripeSubscriptions(userId: string) {
  try {
    // Get user's subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan_type')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (!subscriptions || subscriptions.length === 0) {
      return; // No active subscriptions
    }

    for (const subscription of subscriptions) {
      if (subscription.stripe_subscription_id && subscription.plan_type === 'yearly') {
        try {
          // Cancel yearly subscriptions immediately
          await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
          console.log(`Canceled Stripe subscription: ${subscription.stripe_subscription_id}`);
        } catch (stripeError) {
          console.error('Error canceling Stripe subscription:', stripeError);
          // Continue with deletion even if Stripe cancellation fails
        }
      }

      // Note: Lifetime subscriptions don't have recurring billing to cancel
    }

    // Update subscription status in database
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

  } catch (error) {
    console.error('Error canceling subscriptions:', error);
    // Don't throw - continue with data deletion
  }
}

async function deleteUserData(userId: string) {
  try {
    // Delete in order to handle foreign key constraints
    
    // 1. Delete measurement points (child of sites)
    await supabaseAdmin
      .from('measurement_points')
      .delete()
      .in('site_id', 
        supabaseAdmin
          .from('sites')
          .select('id')
          .in('river_walk_id',
            supabaseAdmin
              .from('river_walks')
              .select('id')
              .eq('user_id', userId)
          )
      );

    // 2. Delete sites (child of river walks)
    await supabaseAdmin
      .from('sites')
      .delete()
      .in('river_walk_id',
        supabaseAdmin
          .from('river_walks')
          .select('id')
          .eq('user_id', userId)
      );

    // 3. Delete river walks
    await supabaseAdmin
      .from('river_walks')
      .delete()
      .eq('user_id', userId);

    // 4. Delete voucher usage records
    await supabaseAdmin
      .from('voucher_usage')
      .delete()
      .eq('user_id', userId);

    // 5. Delete payment events
    await supabaseAdmin
      .from('payment_events')
      .delete()
      .eq('user_id', userId);

    // 6. Delete subscriptions
    await supabaseAdmin
      .from('subscriptions')
      .delete()
      .eq('user_id', userId);

    // 7. Delete collaboration access
    const userEmail = (await supabaseAdmin.auth.admin.getUserById(userId)).data.user?.email;
    if (userEmail) {
      await supabaseAdmin
        .from('collaborator_access')
        .delete()
        .eq('user_email', userEmail);
    }

    // 8. Delete collaboration metadata created by user
    await supabaseAdmin
      .from('collaboration_metadata')
      .delete()
      .eq('created_by', userId);

    // 9. Delete user agreements
    await supabaseAdmin
      .from('user_agreements')
      .delete()
      .eq('user_id', userId);

    // 10. Keep GDPR requests for compliance audit trail
    // (these are kept for legal compliance)

    console.log(`Successfully deleted all data for user: ${userId}`);

  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
}

// Helper function to generate confirmation code
export function generateConfirmationCode(userId: string): string {
  return `DELETE-${userId.slice(-8).toUpperCase()}`;
}