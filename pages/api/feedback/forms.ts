import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../lib/logger';

// Create service role client for operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
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

    const { form_id } = req.query;

    // Use the database function to get user's feedback forms
    const { data, error } = await supabaseAdmin.rpc('get_user_feedback_form', {
      user_uuid: user.id,
      form_uuid: form_id || null
    });

    if (error) {
      logger.error('Failed to fetch user feedback forms', { error, userId: user.id });
      return res.status(500).json({ error: 'Failed to fetch feedback forms' });
    }

    // If specific form requested, return single form
    if (form_id) {
      const form = data && data.length > 0 ? data[0] : null;
      
      if (!form) {
        return res.status(404).json({ error: 'Feedback form not found or not accessible' });
      }

      return res.status(200).json({ form });
    }

    // Return all pending forms for user
    return res.status(200).json({ forms: data || [] });

  } catch (error) {
    logger.error('Feedback forms API error', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}