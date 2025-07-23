import { createClient } from '@supabase/supabase-js';
import { logger } from './logger';

// Create service role client for tracking (bypasses RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export interface CommunicationLogEntry {
  userId?: string;
  userEmail: string;
  userName?: string;
  communicationType: 'email' | 'form_response' | 'account_action' | 'system_notification';
  communicationSubtype?: string;
  direction: 'outbound' | 'inbound' | 'internal';
  status?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'received';
  subject?: string;
  content?: string;
  contentType?: 'html' | 'text' | 'json' | 'form_data';
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface EmailCommunication {
  userId?: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  templateId?: string;
  campaignId?: string;
  emailType: 'welcome' | 'bulk' | 'template' | 'feedback_request' | 'newsletter';
  metadata?: Record<string, any>;
}

export interface FormInteraction {
  userId?: string;
  formId: string;
  interactionType: 'form_sent' | 'form_viewed' | 'form_started' | 'form_submitted' | 'form_abandoned';
  responseId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}

export interface UserActivity {
  userId: string;
  activityType: 'login' | 'logout' | 'signup' | 'profile_update' | 'subscription_change' | 'password_reset';
  activityDescription?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a communication event to the communication_log table
 */
export async function logCommunication(entry: CommunicationLogEntry): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for communication tracking');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('communication_log')
      .insert({
        user_id: entry.userId || null,
        user_email: entry.userEmail,
        user_name: entry.userName || null,
        communication_type: entry.communicationType,
        communication_subtype: entry.communicationSubtype || null,
        direction: entry.direction,
        status: entry.status || 'sent',
        subject: entry.subject || null,
        content: entry.content || null,
        content_type: entry.contentType || 'text',
        metadata: entry.metadata || {},
        ip_address: entry.ipAddress || null,
        user_agent: entry.userAgent || null
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to log communication', { error, entry });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error logging communication', { error, entry });
    return null;
  }
}

/**
 * Log an email communication with detailed tracking
 */
export async function logEmailCommunication(
  email: EmailCommunication, 
  communicationLogId?: string
): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for email tracking');
    return null;
  }

  try {
    // If no communication log ID provided, create one
    let logId: string | null = communicationLogId || null;
    if (!logId) {
      logId = await logCommunication({
        userId: email.userId,
        userEmail: email.toEmail,
        communicationType: 'email',
        communicationSubtype: email.emailType,
        direction: 'outbound',
        status: 'sent',
        subject: email.subject,
        content: email.bodyText || email.bodyHtml,
        contentType: email.bodyHtml ? 'html' : 'text',
        metadata: {
          templateId: email.templateId,
          campaignId: email.campaignId,
          emailType: email.emailType,
          ...email.metadata
        }
      });
      
      if (!logId) {
        logger.error('Failed to create communication log entry for email');
        return null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('email_communications')
      .insert({
        communication_log_id: logId,
        user_id: email.userId || null,
        from_email: email.fromEmail,
        to_email: email.toEmail,
        subject: email.subject,
        body_html: email.bodyHtml || null,
        body_text: email.bodyText || null,
        template_id: email.templateId || null,
        campaign_id: email.campaignId || null,
        email_type: email.emailType,
        metadata: email.metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to log email communication', { error, email });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error logging email communication', { error, email });
    return null;
  }
}

/**
 * Log a form interaction
 */
export async function logFormInteraction(
  interaction: FormInteraction,
  communicationLogId?: string
): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for form tracking');
    return null;
  }

  try {
    // If no communication log ID provided, create one
    let logId: string | null = communicationLogId || null;
    if (!logId) {
      logId = await logCommunication({
        userId: interaction.userId,
        userEmail: interaction.userId ? 'user@system' : 'anonymous@system', // This should be resolved from user ID
        communicationType: 'form_response',
        communicationSubtype: interaction.interactionType,
        direction: interaction.interactionType === 'form_submitted' ? 'inbound' : 'internal',
        status: 'received',
        metadata: {
          formId: interaction.formId,
          responseId: interaction.responseId,
          ...interaction.metadata
        }
      });
      
      if (!logId) {
        logger.error('Failed to create communication log entry for form interaction');
        return null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('form_interactions')
      .insert({
        communication_log_id: logId,
        user_id: interaction.userId || null,
        form_id: interaction.formId,
        interaction_type: interaction.interactionType,
        response_id: interaction.responseId || null,
        session_id: interaction.sessionId || null,
        ip_address: interaction.ipAddress || null,
        user_agent: interaction.userAgent || null,
        referrer: interaction.referrer || null,
        metadata: interaction.metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to log form interaction', { error, interaction });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error logging form interaction', { error, interaction });
    return null;
  }
}

/**
 * Log user activity
 */
export async function logUserActivity(
  activity: UserActivity,
  communicationLogId?: string
): Promise<string | null> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for activity tracking');
    return null;
  }

  try {
    // Get user email for communication log
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(activity.userId);
    const userEmail = userData.user?.email || 'unknown@system';

    // If no communication log ID provided, create one
    let logId: string | null = communicationLogId || null;
    if (!logId) {
      logId = await logCommunication({
        userId: activity.userId,
        userEmail: userEmail,
        communicationType: 'account_action',
        communicationSubtype: activity.activityType,
        direction: 'internal',
        status: 'received',
        subject: activity.activityDescription,
        metadata: activity.metadata
      });
      
      if (!logId) {
        logger.error('Failed to create communication log entry for user activity');
        return null;
      }
    }

    const { data, error } = await supabaseAdmin
      .from('user_activity_log')
      .insert({
        communication_log_id: logId,
        user_id: activity.userId,
        activity_type: activity.activityType,
        activity_description: activity.activityDescription || null,
        ip_address: activity.ipAddress || null,
        user_agent: activity.userAgent || null,
        metadata: activity.metadata || {}
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to log user activity', { error, activity });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error('Error logging user activity', { error, activity });
    return null;
  }
}

/**
 * Update email communication status (for delivery tracking)
 */
export async function updateEmailStatus(
  emailCommunicationId: string,
  status: 'delivered' | 'opened' | 'clicked' | 'failed',
  failureReason?: string
): Promise<boolean> {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for email status update');
    return false;
  }

  try {
    const updateData: any = {};
    
    switch (status) {
      case 'delivered':
        updateData.delivered_at = new Date().toISOString();
        break;
      case 'opened':
        updateData.opened_at = new Date().toISOString();
        break;
      case 'clicked':
        updateData.clicked_at = new Date().toISOString();
        break;
      case 'failed':
        updateData.failed_at = new Date().toISOString();
        updateData.failure_reason = failureReason;
        break;
    }

    const { error } = await supabaseAdmin
      .from('email_communications')
      .update(updateData)
      .eq('id', emailCommunicationId);

    if (error) {
      logger.error('Failed to update email status', { error, emailCommunicationId, status });
      return false;
    }

    // Also update the main communication log
    await supabaseAdmin
      .from('communication_log')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', emailCommunicationId);

    return true;
  } catch (error) {
    logger.error('Error updating email status', { error, emailCommunicationId, status });
    return false;
  }
}

/**
 * Get communication history for a user (for GDPR or user dashboard)
 */
export async function getUserCommunicationHistory(userId: string, limit = 100) {
  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available for communication history');
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('communication_log')
      .select(`
        *,
        email_communications (*),
        form_interactions (*),
        user_activity_log (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get user communication history', { error, userId });
      return null;
    }

    return data;
  } catch (error) {
    logger.error('Error getting user communication history', { error, userId });
    return null;
  }
}