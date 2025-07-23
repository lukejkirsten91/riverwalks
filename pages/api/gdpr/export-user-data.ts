import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '../../../lib/auth';
import { logger } from '../../../lib/logger';

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
    // Get user session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    const { userId } = req.body;
    
    // Users can export their own data, admins can export any user's data
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin && user.id !== userId) {
      return res.status(403).json({ error: 'You can only export your own data' });
    }

    // Get target user info
    const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!targetUserData.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = targetUserData.user;
    const exportData: any = {
      export_info: {
        exported_at: new Date().toISOString(),
        exported_by: user.id,
        user_id: userId,
        export_type: 'complete_gdpr_export'
      },
      user_account: {},
      communications: {},
      feedback_data: {},
      usage_data: {},
      legal_basis: {
        data_processing_basis: 'GDPR Article 6(1)(b) - Contract performance',
        data_retention_policy: 'Data retained as per our Privacy Policy',
        user_rights: [
          'Right to access (Article 15)',
          'Right to rectification (Article 16)', 
          'Right to erasure (Article 17)',
          'Right to restrict processing (Article 18)',
          'Right to data portability (Article 20)',
          'Right to object (Article 21)'
        ]
      }
    };

    // 1. User Account Information
    exportData.user_account = {
      id: targetUser.id,
      email: targetUser.email,
      created_at: targetUser.created_at,
      updated_at: targetUser.updated_at,
      email_confirmed_at: targetUser.email_confirmed_at,
      last_sign_in_at: targetUser.last_sign_in_at,
      user_metadata: targetUser.user_metadata,
      app_metadata: targetUser.app_metadata,
      phone: targetUser.phone,
      confirmed_at: targetUser.confirmed_at
    };

    // 2. Communication History
    const { data: communications } = await supabaseAdmin
      .from('communication_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: emailCommunications } = await supabaseAdmin
      .from('email_communications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    exportData.communications = {
      communication_log: communications || [],
      email_communications: emailCommunications || [],
      total_communications: (communications?.length || 0),
      communication_summary: {
        emails_received: emailCommunications?.length || 0,
        last_communication: communications?.[0]?.created_at || null
      }
    };

    // 3. Feedback and Form Data
    const { data: feedbackResponses } = await supabaseAdmin
      .from('feedback_responses')
      .select(`
        *,
        feedback_forms:form_id (
          id, name, description
        )
      `)
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    const { data: formInteractions } = await supabaseAdmin
      .from('form_interactions')
      .select(`
        *,
        feedback_forms:form_id (
          id, name, description
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const { data: feedbackSentTracking } = await supabaseAdmin
      .from('feedback_sent_tracking')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });

    exportData.feedback_data = {
      responses: feedbackResponses || [],
      form_interactions: formInteractions || [],
      sent_tracking: feedbackSentTracking || [],
      summary: {
        total_responses: feedbackResponses?.length || 0,
        total_interactions: formInteractions?.length || 0,
        forms_sent: feedbackSentTracking?.length || 0
      }
    };

    // 4. Usage and Activity Data
    const { data: userActivity } = await supabaseAdmin
      .from('user_activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    exportData.usage_data = {
      activity_log: userActivity || [],
      summary: {
        total_activities: userActivity?.length || 0,
        account_created: targetUser.created_at,
        last_activity: userActivity?.[0]?.created_at || targetUser.last_sign_in_at
      }
    };

    // 5. Subscription and Payment Data (if exists)
    // Note: This would need to be extended based on your subscription system
    exportData.subscription_data = {
      subscription_type: targetUser.user_metadata?.subscription_type || 'free',
      subscription_status: targetUser.user_metadata?.subscription_status || 'active',
      note: 'Full payment history available upon request through support'
    };

    // 6. Associated Data from other systems
    // Add any other user data that exists in your system
    exportData.additional_data = {
      marketing_consent: targetUser.user_metadata?.marketing_consent || false,
      preferences: targetUser.user_metadata?.preferences || {},
      profile_data: {
        display_name: targetUser.user_metadata?.display_name,
        avatar_url: targetUser.user_metadata?.avatar_url,
        full_name: targetUser.user_metadata?.full_name
      }
    };

    // Log the GDPR export request
    await supabaseAdmin
      .from('communication_log')
      .insert({
        user_id: userId,
        user_email: targetUser.email,
        user_name: targetUser.user_metadata?.display_name || targetUser.user_metadata?.full_name,
        communication_type: 'gdpr_request',
        communication_subtype: 'data_export',
        direction: 'internal',
        status: 'completed',
        subject: 'GDPR Data Export Request',
        content: `Data export requested by ${isAdmin ? 'admin' : 'user'} (${user.email})`,
        content_type: 'json',
        metadata: {
          exported_by: user.id,
          export_size: JSON.stringify(exportData).length,
          sections_included: Object.keys(exportData).length
        }
      });

    // Create GDPR request record
    await supabaseAdmin
      .from('gdpr_requests')
      .insert({
        user_id: userId,
        request_type: 'export',
        request_status: 'completed',
        requested_by: user.id,
        request_details: {
          export_sections: Object.keys(exportData),
          total_records: {
            communications: exportData.communications.total_communications,
            feedback_responses: exportData.feedback_data.summary.total_responses,
            activities: exportData.usage_data.summary.total_activities
          }
        },
        processed_at: new Date().toISOString()
      });

    logger.info('GDPR data export completed', {
      userId,
      exportedBy: user.id,
      sections: Object.keys(exportData).length
    });

    return res.status(200).json({
      success: true,
      message: 'User data exported successfully',
      export_data: exportData,
      export_summary: {
        user_email: targetUser.email,
        export_timestamp: exportData.export_info.exported_at,
        total_sections: Object.keys(exportData).length,
        data_points: {
          communications: exportData.communications.total_communications,
          feedback_responses: exportData.feedback_data.summary.total_responses,
          activities: exportData.usage_data.summary.total_activities
        }
      }
    });

  } catch (error) {
    logger.error('GDPR export error', { error, userId: req.body.userId });
    return res.status(500).json({
      error: 'Failed to export user data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function for admin check
async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin privileges required' };
  }
  return { isAdmin: true };
}