import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
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

    const { form_id, campaign_id, responses: userResponses } = req.body;

    if (!form_id || !userResponses || !Array.isArray(userResponses)) {
      return res.status(400).json({ 
        error: 'Missing required fields: form_id, responses (array)' 
      });
    }

    // Verify form exists and is active
    const { data: form, error: formError } = await supabaseAdmin
      .from('feedback_forms')
      .select(`
        id,
        name,
        is_active,
        feedback_questions (
          id,
          question_text,
          question_type,
          required,
          order_index
        )
      `)
      .eq('id', form_id)
      .single();

    if (formError || !form) {
      return res.status(404).json({ error: 'Feedback form not found' });
    }

    if (!form.is_active) {
      return res.status(400).json({ error: 'This feedback form is no longer active' });
    }

    // Check if user has already responded to this form
    let existingResponseQuery = supabaseAdmin
      .from('feedback_responses')
      .select('id')
      .eq('form_id', form_id)
      .eq('user_id', user.id);

    if (campaign_id) {
      existingResponseQuery = existingResponseQuery.eq('campaign_id', campaign_id);
    }

    const { data: existingResponses } = await existingResponseQuery;

    if (existingResponses && existingResponses.length > 0) {
      return res.status(400).json({ 
        error: 'You have already submitted a response to this feedback form' 
      });
    }

    // Validate responses against form questions
    const questions = form.feedback_questions || [];
    const questionMap = new Map(questions.map(q => [q.id, q]));
    
    // Check required questions
    const requiredQuestions = questions.filter(q => q.required);
    const responseQuestionIds = userResponses.map(r => r.question_id);
    
    const missingRequired = requiredQuestions.filter(q => !responseQuestionIds.includes(q.id));
    if (missingRequired.length > 0) {
      return res.status(400).json({ 
        error: 'Missing responses to required questions',
        missing_questions: missingRequired.map(q => q.question_text)
      });
    }

    // Validate each response
    for (const response of userResponses) {
      const question = questionMap.get(response.question_id);
      if (!question) {
        return res.status(400).json({ 
          error: `Invalid question ID: ${response.question_id}` 
        });
      }

      // Basic validation by question type
      if (question.question_type === 'rating') {
        const rating = parseFloat(response.answer);
        if (isNaN(rating) || rating < 1) {
          return res.status(400).json({ 
            error: `Invalid rating for question: ${question.question_text}` 
          });
        }
      }

      if (question.required && (!response.answer || response.answer.toString().trim() === '')) {
        return res.status(400).json({ 
          error: `Response required for question: ${question.question_text}` 
        });
      }
    }

    // Get user details
    const userEmail = user.email || '';
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0];

    // Insert response
    const { data: feedbackResponse, error: insertError } = await supabaseAdmin
      .from('feedback_responses')
      .insert([{
        form_id,
        campaign_id: campaign_id || null,
        user_id: user.id,
        user_email: userEmail,
        user_name: userName,
        responses: userResponses,
        submitted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      logger.error('Failed to insert feedback response', { error: insertError });
      return res.status(500).json({ error: 'Failed to submit feedback response' });
    }

    // Update tracking record if this was part of a campaign
    if (campaign_id) {
      const { error: trackingError } = await supabaseAdmin
        .from('feedback_sent_tracking')
        .update({ 
          completed_at: new Date().toISOString(),
          response_id: feedbackResponse.id
        })
        .eq('user_id', user.id)
        .eq('form_id', form_id)
        .eq('campaign_id', campaign_id)
        .is('completed_at', null);

      if (trackingError) {
        logger.error('Failed to update tracking', { error: trackingError });
      }

      // Update campaign response count
      const { error: campaignUpdateError } = await supabaseAdmin.rpc(
        'increment_campaign_responses',
        { campaign_uuid: campaign_id }
      );

      if (campaignUpdateError) {
        logger.error('Failed to update campaign count', { error: campaignUpdateError });
      }
    }

    logger.info('Feedback response submitted', {
      userId: user.id,
      userEmail,
      formId: form_id,
      campaignId: campaign_id,
      responseId: feedbackResponse.id,
      questionCount: userResponses.length
    });

    return res.status(201).json({ 
      success: true,
      message: 'Feedback submitted successfully',
      response_id: feedbackResponse.id
    });

  } catch (error) {
    logger.error('Feedback submission error', { error, body: req.body });
    res.status(500).json({ 
      error: 'Failed to submit feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}