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

    // Check admin privileges
    const { isAdmin, error: adminError } = await requireAdmin(user.id);
    if (!isAdmin) {
      logger.warn('Non-admin user attempted to access feedback campaigns', { 
        userId: user.id,
        email: user.email 
      });
      return res.status(403).json({ error: adminError || 'Admin privileges required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    switch (req.method) {
      case 'GET':
        return handleGet(req, res, supabaseAdmin, user);
      case 'POST':
        return handlePost(req, res, supabaseAdmin, user);
      case 'PUT':
        return handlePut(req, res, supabaseAdmin, user);
      case 'DELETE':
        return handleDelete(req, res, supabaseAdmin, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    logger.error('Feedback campaigns API error', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id, form_id } = req.query;
  
  if (id) {
    // Get specific campaign
    const { data: campaign, error } = await supabaseAdmin
      .from('feedback_campaigns')
      .select(`
        *,
        feedback_forms:form_id (
          id,
          name,
          description
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      logger.error('Failed to fetch feedback campaign', { error, campaignId: id });
      return res.status(500).json({ error: 'Failed to fetch feedback campaign' });
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get tracking data for this campaign
    const { data: tracking, error: trackingError } = await supabaseAdmin
      .from('feedback_sent_tracking')
      .select(`
        *,
        auth.users:user_id (
          email,
          created_at
        )
      `)
      .eq('campaign_id', id)
      .order('sent_at', { ascending: false });

    if (trackingError) {
      logger.error('Failed to fetch campaign tracking', { error: trackingError, campaignId: id });
    }

    return res.status(200).json({ 
      campaign: {
        ...campaign,
        tracking: tracking || []
      }
    });
  }
  
  // Get all campaigns or campaigns for specific form
  let query = supabaseAdmin
    .from('feedback_campaigns')
    .select(`
      *,
      feedback_forms:form_id (
        id,
        name,
        description
      )
    `);
  
  if (form_id) {
    query = query.eq('form_id', form_id);
  }
  
  const { data: campaigns, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Failed to fetch feedback campaigns', { error });
    return res.status(500).json({ error: 'Failed to fetch feedback campaigns' });
  }
  
  return res.status(200).json({ campaigns: campaigns || [] });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { form_id, name, description, user_ids } = req.body;
  
  if (!form_id || !name || !user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ 
      error: 'Missing required fields: form_id, name, user_ids (array)' 
    });
  }

  // Verify form exists and is active
  const { data: form, error: formError } = await supabaseAdmin
    .from('feedback_forms')
    .select('id, name, is_active')
    .eq('id', form_id)
    .single();

  if (formError || !form) {
    return res.status(404).json({ error: 'Feedback form not found' });
  }

  if (!form.is_active) {
    return res.status(400).json({ error: 'Cannot create campaign for inactive form' });
  }

  // Verify users exist and have marketing consent
  const { data: users, error: usersError } = await supabaseAdmin
    .from('auth.users')
    .select('id, email')
    .in('id', user_ids);

  if (usersError) {
    logger.error('Failed to verify users', { error: usersError });
    return res.status(500).json({ error: 'Failed to verify users' });
  }

  const validUserIds = (users || []).map((u: any) => u.id);
  const invalidUserIds = user_ids.filter(id => !validUserIds.includes(id));

  if (invalidUserIds.length > 0) {
    return res.status(400).json({ 
      error: 'Some user IDs are invalid',
      invalid_users: invalidUserIds
    });
  }

  // Check for users who already have pending campaigns for this form
  const { data: existingTracking, error: trackingError } = await supabaseAdmin
    .from('feedback_sent_tracking')
    .select('user_id')
    .eq('form_id', form_id)
    .is('completed_at', null)
    .in('user_id', user_ids);

  if (trackingError) {
    logger.error('Failed to check existing tracking', { error: trackingError });
  }

  const alreadySentUserIds = (existingTracking || []).map((t: any) => t.user_id);
  const newUserIds = user_ids.filter(id => !alreadySentUserIds.includes(id));

  if (newUserIds.length === 0) {
    return res.status(400).json({ 
      error: 'All selected users have already been sent this feedback form and have not completed it yet',
      already_sent: alreadySentUserIds
    });
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabaseAdmin
    .from('feedback_campaigns')
    .insert([{
      form_id,
      name,
      description: description || null,
      sent_to: newUserIds,
      sent_count: newUserIds.length,
      response_count: 0,
      sent_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (campaignError) {
    logger.error('Failed to create feedback campaign', { error: campaignError });
    return res.status(500).json({ error: 'Failed to create feedback campaign' });
  }

  // Create tracking entries
  const trackingEntries = newUserIds.map(userId => ({
    user_id: userId,
    form_id,
    campaign_id: campaign.id,
    sent_at: new Date().toISOString()
  }));

  const { error: trackingInsertError } = await supabaseAdmin
    .from('feedback_sent_tracking')
    .insert(trackingEntries);

  if (trackingInsertError) {
    // Rollback campaign creation
    await supabaseAdmin.from('feedback_campaigns').delete().eq('id', campaign.id);
    logger.error('Failed to create tracking entries', { error: trackingInsertError });
    return res.status(500).json({ error: 'Failed to create campaign tracking' });
  }

  logger.info('Feedback campaign created', {
    adminId: user.id,
    campaignId: campaign.id,
    formId: form_id,
    userCount: newUserIds.length,
    skippedUsers: alreadySentUserIds.length
  });
  
  return res.status(201).json({ 
    campaign,
    sent_to_count: newUserIds.length,
    skipped_users: alreadySentUserIds
  });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id, name, description } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }
  
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  const { data: campaign, error } = await supabaseAdmin
    .from('feedback_campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to update feedback campaign', { error, campaignId: id });
    return res.status(500).json({ error: 'Failed to update feedback campaign' });
  }
  
  logger.info('Feedback campaign updated', {
    adminId: user.id,
    campaignId: id,
    updates: Object.keys(updateData)
  });
  
  return res.status(200).json({ campaign });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }
  
  // Check if campaign has responses
  const { data: responses, error: responseCheckError } = await supabaseAdmin
    .from('feedback_responses')
    .select('id')
    .eq('campaign_id', id)
    .limit(1);

  if (responseCheckError) {
    logger.error('Failed to check for campaign responses', { error: responseCheckError, campaignId: id });
    return res.status(500).json({ error: 'Failed to check campaign usage' });
  }

  if (responses && responses.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete campaign with existing responses' 
    });
  }
  
  const { error } = await supabaseAdmin
    .from('feedback_campaigns')
    .delete()
    .eq('id', id);
  
  if (error) {
    logger.error('Failed to delete feedback campaign', { error, campaignId: id });
    return res.status(500).json({ error: 'Failed to delete feedback campaign' });
  }
  
  logger.info('Feedback campaign deleted', {
    adminId: user.id,
    campaignId: id
  });
  
  return res.status(200).json({ success: true });
}

// Helper function for admin check
async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin privileges required' };
  }
  return { isAdmin: true };
}