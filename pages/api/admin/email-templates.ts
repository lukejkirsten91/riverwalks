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
      logger.warn('Non-admin user attempted to access email templates', { 
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
    logger.error('Email templates API error', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { type } = req.query;
  
  let query = supabaseAdmin.from('email_templates').select('*');
  
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Failed to fetch email templates', { error });
    return res.status(500).json({ error: 'Failed to fetch email templates' });
  }
  
  return res.status(200).json({ templates: data });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { name, type, subject, content, variables } = req.body;
  
  if (!name || !type || !subject || !content) {
    return res.status(400).json({ error: 'Missing required fields: name, type, subject, content' });
  }
  
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .insert([{
      name,
      type,
      subject,
      content,
      variables: variables || [],
      is_active: true
    }])
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to create email template', { error });
    return res.status(500).json({ error: 'Failed to create email template' });
  }
  
  logger.info('Email template created', {
    adminId: user.id,
    templateId: data.id,
    templateName: name,
    templateType: type
  });
  
  return res.status(201).json({ template: data });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id, name, type, subject, content, variables, is_active } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Template ID required' });
  }
  
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) updateData.type = type;
  if (subject !== undefined) updateData.subject = subject;
  if (content !== undefined) updateData.content = content;
  if (variables !== undefined) updateData.variables = variables;
  if (is_active !== undefined) updateData.is_active = is_active;
  updateData.updated_at = new Date().toISOString();
  
  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    logger.error('Failed to update email template', { error, templateId: id });
    return res.status(500).json({ error: 'Failed to update email template' });
  }
  
  logger.info('Email template updated', {
    adminId: user.id,
    templateId: id,
    updates: Object.keys(updateData)
  });
  
  return res.status(200).json({ template: data });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Template ID required' });
  }
  
  const { error } = await supabaseAdmin
    .from('email_templates')
    .delete()
    .eq('id', id);
  
  if (error) {
    logger.error('Failed to delete email template', { error, templateId: id });
    return res.status(500).json({ error: 'Failed to delete email template' });
  }
  
  logger.info('Email template deleted', {
    adminId: user.id,
    templateId: id
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