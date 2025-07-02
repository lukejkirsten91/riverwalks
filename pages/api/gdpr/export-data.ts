import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types';

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

    // Create GDPR request record
    const { data: gdprRequest, error: requestError } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: user.id,
        request_type: 'data_export',
        status: 'processing',
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error creating GDPR request:', requestError);
      return res.status(500).json({ error: 'Failed to create data export request' });
    }

    try {
      // Collect all user data
      const userData = await collectUserData(supabase, user.id);

      // Update request with exported data
      const { error: updateError } = await supabase
        .from('gdpr_requests')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          requested_data: userData,
        })
        .eq('id', gdprRequest.id);

      if (updateError) {
        console.error('Error updating GDPR request:', updateError);
      }

      res.status(200).json({
        message: 'Data export completed',
        requestId: gdprRequest.id,
        data: userData,
        exportedAt: new Date().toISOString(),
      });

    } catch (dataError) {
      console.error('Error collecting user data:', dataError);

      // Update request status to failed
      await supabase
        .from('gdpr_requests')
        .update({
          status: 'failed',
          notes: 'Failed to collect user data: ' + (dataError as Error).message,
        })
        .eq('id', gdprRequest.id);

      res.status(500).json({ error: 'Failed to export user data' });
    }

  } catch (error) {
    console.error('Error in GDPR data export endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function collectUserData(supabase: any, userId: string) {
  const userData: any = {
    exportedAt: new Date().toISOString(),
    userId: userId,
    sections: {},
  };

  try {
    // 1. User profile data (from auth.users)
    const { data: userProfile } = await supabase.auth.admin.getUserById(userId);
    if (userProfile.user) {
      userData.sections.profile = {
        id: userProfile.user.id,
        email: userProfile.user.email,
        createdAt: userProfile.user.created_at,
        lastSignIn: userProfile.user.last_sign_in_at,
        emailConfirmed: userProfile.user.email_confirmed_at,
      };
    }

    // 2. Terms acceptance records
    const { data: termsAcceptance } = await supabase
      .from('user_agreements')
      .select('*')
      .eq('user_id', userId);
    
    userData.sections.termsAcceptance = termsAcceptance || [];

    // 3. River walks data
    const { data: riverWalks } = await supabase
      .from('river_walks')
      .select(`
        *,
        sites (
          *,
          measurement_points (*)
        )
      `)
      .eq('user_id', userId);
    
    userData.sections.riverWalks = riverWalks || [];

    // 4. Subscription data
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);
    
    // Remove sensitive Stripe data but keep subscription history
    userData.sections.subscriptions = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      planType: sub.plan_type,
      planPrice: sub.plan_price_pence,
      status: sub.status,
      subscriptionStart: sub.subscription_start,
      subscriptionEnd: sub.subscription_end,
      voucherCode: sub.voucher_code,
      discountApplied: sub.discount_applied_pence,
      currency: sub.currency,
      createdAt: sub.created_at,
      canceledAt: sub.canceled_at,
      // Exclude sensitive Stripe IDs
    }));

    // 5. Voucher usage history
    const { data: voucherUsage } = await supabase
      .from('voucher_usage')
      .select(`
        *,
        vouchers (code, description)
      `)
      .eq('user_id', userId);
    
    userData.sections.voucherUsage = voucherUsage || [];

    // 6. Payment events (sanitized)
    const { data: paymentEvents } = await supabase
      .from('payment_events')
      .select('*')
      .eq('user_id', userId);
    
    // Remove sensitive payment data
    userData.sections.paymentEvents = (paymentEvents || []).map((event: any) => ({
      id: event.id,
      eventType: event.event_type,
      amountPence: event.amount_pence,
      currency: event.currency,
      paymentMethod: event.payment_method,
      createdAt: event.created_at,
      // Exclude detailed stripe_data
    }));

    // 7. Collaboration data
    const { data: collaborationMetadata } = await supabase
      .from('collaboration_metadata')
      .select('*')
      .eq('created_by', userId);
    
    const { data: collaboratorAccess } = await supabase
      .from('collaborator_access')
      .select(`
        *,
        collaboration_metadata (river_walk_reference_id)
      `)
      .eq('user_email', userData.sections.profile?.email);
    
    userData.sections.collaboration = {
      ownedCollaborations: collaborationMetadata || [],
      accessedCollaborations: collaboratorAccess || [],
    };

    // 8. GDPR requests history
    const { data: gdprRequests } = await supabase
      .from('gdpr_requests')
      .select('id, request_type, status, created_at, processed_at')
      .eq('user_id', userId);
    
    userData.sections.gdprRequests = gdprRequests || [];

    // 9. Summary statistics
    userData.sections.summary = {
      totalRiverWalks: riverWalks?.length || 0,
      totalSites: riverWalks?.reduce((sum: number, rw: any) => sum + (rw.sites?.length || 0), 0) || 0,
      totalMeasurementPoints: riverWalks?.reduce((sum: number, rw: any) => 
        sum + (rw.sites?.reduce((siteSum: number, site: any) => 
          siteSum + (site.measurement_points?.length || 0), 0) || 0), 0) || 0,
      hasActiveSubscription: subscriptions?.some((sub: any) => sub.status === 'active') || false,
      accountCreated: userData.sections.profile?.createdAt,
      dataExportedAt: new Date().toISOString(),
    };

    return userData;

  } catch (error) {
    console.error('Error in collectUserData:', error);
    throw error;
  }
}

// Helper function to check if user has requested data export recently
export async function hasRecentDataExport(supabase: any, userId: string): Promise<boolean> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const { data } = await supabase
    .from('gdpr_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('request_type', 'data_export')
    .gte('created_at', oneDayAgo.toISOString())
    .limit(1);
  
  return (data?.length || 0) > 0;
}