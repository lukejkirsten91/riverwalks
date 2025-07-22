import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../lib/logger';

// Use service role client to allow anonymous submissions
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

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { form_id, responses, user_id, user_email, user_name } = req.body;

    if (!form_id || !responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Missing required fields: form_id, responses' });
    }

    if (responses.length === 0) {
      return res.status(400).json({ error: 'At least one response is required' });
    }

    // Verify form exists and is active
    const { data: form, error: formError } = await supabaseAdmin
      .from('feedback_forms')
      .select('id, name, is_active')
      .eq('id', form_id)
      .single();

    if (formError || !form) {
      logger.error('Form not found for submission', { formId: form_id, error: formError });
      return res.status(404).json({ error: 'Feedback form not found' });
    }

    if (!form.is_active) {
      return res.status(400).json({ error: 'This feedback form is no longer accepting responses' });
    }

    // Insert the feedback response
    const { data: response, error: responseError } = await supabaseAdmin
      .from('feedback_responses')
      .insert({
        form_id,
        user_id: user_id || null,
        user_email: user_email || 'anonymous@example.com',
        user_name: user_name || 'Anonymous',
        responses: responses
      })
      .select()
      .single();

    if (responseError) {
      logger.error('Error inserting feedback response', { error: responseError, formId: form_id });
      return res.status(500).json({ error: 'Failed to save feedback response' });
    }

    // If there's a user_id, update any tracking records to mark as completed
    if (user_id) {
      const { error: trackingError } = await supabaseAdmin
        .from('feedback_sent_tracking')
        .update({
          completed_at: new Date().toISOString(),
          response_id: response.id
        })
        .eq('user_id', user_id)
        .eq('form_id', form_id)
        .is('completed_at', null);

      if (trackingError) {
        logger.warn('Failed to update tracking record', { error: trackingError, userId: user_id, formId: form_id });
        // Don't fail the request for this
      }
    }

    logger.info('Feedback response submitted successfully', {
      responseId: response.id,
      formId: form_id,
      userId: user_id,
      responseCount: responses.length
    });

    return res.status(200).json({
      success: true,
      responseId: response.id,
      message: 'Feedback submitted successfully'
    });

  } catch (error) {
    logger.error('Error in feedback submission API', { error });
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}