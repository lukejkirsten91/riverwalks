import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../lib/auth';
import { logger } from '../../../lib/logger';
import { rateLimiters } from '../../../lib/rate-limit';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Apply rate limiting for admin endpoints
  if (!rateLimiters.admin(req, res)) {
    return; // Rate limit exceeded
  }

  if (req.method !== 'GET') {
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
    
    if (authError || !user) {
      return res.status(403).json({ error: 'Authentication required' });
    }

    const adminCheck = await requireAdmin(user.id);
    if (!adminCheck.isAdmin) {
      return res.status(403).json({ error: adminCheck.error || 'Admin access required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // Load all users using service role
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      logger.error('Error loading users for admin stats', { error: usersError.message });
      return res.status(500).json({ error: 'Failed to load users' });
    }

    // Load subscriptions
    const { data: subscriptionsData, error: subsError } = await supabaseAdmin
      .from('subscriptions')
      .select('*');

    // Load user agreements for marketing consent
    const { data: agreementsData, error: agreementsError } = await supabaseAdmin
      .from('user_agreements')
      .select('user_id, marketing_consent, terms_accepted_at');
    
    // Debug logging for marketing consent
    console.log('Total users loaded:', usersData.users.length);
    console.log('User agreements loaded:', agreementsData?.length || 0);
    console.log('Users with marketing consent in agreements:', agreementsData?.filter(a => a.marketing_consent).length || 0);

    // Load email sending history
    const { data: emailHistory, error: emailError } = await supabaseAdmin
      .from('feedback_sent_tracking')
      .select('user_id, sent_at, form_id');

    // Load feedback responses 
    const { data: feedbackResponses, error: feedbackError } = await supabaseAdmin
      .from('feedback_responses')
      .select('user_id, form_id, submitted_at');

    if (subsError) {
      console.error('Error loading subscriptions:', subsError);
      return res.status(500).json({ error: 'Failed to load subscriptions' });
    }

    if (agreementsError) {
      console.error('Error loading user agreements:', agreementsError);
      // Don't fail completely, just log the error and continue without marketing consent data
    }

    // Calculate stats
    const totalUsers = usersData.users.length;
    const activeSubscriptions = subscriptionsData?.filter(s => s.status === 'active').length || 0;
    const totalRevenue = subscriptionsData?.reduce((sum, sub) => {
      if (sub.status === 'active') {
        return sum + (sub.subscription_type === 'lifetime' ? 3.49 : 1.99);
      }
      return sum;
    }, 0) || 0;

    const stats = {
      totalUsers,
      activeSubscriptions,
      totalRevenue,
      conversionRate: totalUsers > 0 ? (activeSubscriptions / totalUsers) * 100 : 0
    };

    // Create users array with subscription data and name information
    const users = usersData.users.map(user => {
      const subscription = subscriptionsData?.find(s => s.user_id === user.id);
      const agreement = agreementsData?.find(a => a.user_id === user.id);
      const metadata = user.user_metadata || {};
      
      // Extract names from metadata or full_name
      let first_name = metadata.first_name;
      let last_name = metadata.last_name;
      
      // If no separate first/last name, try to split full_name
      if (!first_name && !last_name && metadata.full_name) {
        const nameParts = metadata.full_name.trim().split(' ');
        first_name = nameParts[0] || null;
        last_name = nameParts.slice(1).join(' ') || null;
      }
      
      // Check marketing consent from both sources
      const hasMarketingConsent = agreement?.marketing_consent || 
                                  metadata.marketing_consent === true ||
                                  metadata.marketing_consent === 'true' ||
                                  false;
      
      // Debug logging for individual users
      if (metadata.marketing_consent || agreement?.marketing_consent) {
        console.log(`User ${user.email}: agreement=${agreement?.marketing_consent}, metadata=${metadata.marketing_consent}, final=${hasMarketingConsent}`);
      }

      // Get email sending history for this user
      const userEmailHistory = emailHistory?.filter(e => e.user_id === user.id) || [];
      const lastEmailSent = userEmailHistory.length > 0 
        ? userEmailHistory.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0]
        : null;

      // Get feedback responses for this user  
      const userResponses = feedbackResponses?.filter(r => r.user_id === user.id) || [];
      const hasCompletedForms = userResponses.length > 0;
      const lastFormCompleted = userResponses.length > 0
        ? userResponses.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
        : null;

      return {
        id: user.id,
        email: user.email || 'No email',
        email_confirmed_at: user.email_confirmed_at,
        subscription_type: subscription?.subscription_type || null,
        status: subscription?.status || null,
        created_at: user.created_at,
        current_period_end: subscription?.current_period_end || null,
        first_name: first_name || null,
        last_name: last_name || null,
        display_name: metadata.display_name || null,
        marketing_consent: hasMarketingConsent,
        marketing_consent_date: agreement?.terms_accepted_at || null,
        // Email and form tracking data
        emails_sent_count: userEmailHistory.length,
        last_email_sent: lastEmailSent?.sent_at || null,
        last_email_form_id: lastEmailSent?.form_id || null,
        forms_completed_count: userResponses.length,
        has_completed_forms: hasCompletedForms,
        last_form_completed: lastFormCompleted?.submitted_at || null,
        last_completed_form_id: lastFormCompleted?.form_id || null
      };
    });

    // Sort users by creation date (newest first)
    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Debug final count
    const finalMarketingConsentCount = users.filter(u => u.marketing_consent).length;
    console.log('Final users with marketing consent:', finalMarketingConsentCount);

    return res.status(200).json({
      stats,
      users
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}