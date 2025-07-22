import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logger } from '../../../../lib/logger';

// Use service role client to bypass RLS for public form access
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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Form ID is required' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get the feedback form with its questions
    const { data: form, error: formError } = await supabaseAdmin
      .from('feedback_forms')
      .select(`
        id,
        name,
        description,
        is_active,
        feedback_questions (
          id,
          question_text,
          question_type,
          options,
          required,
          order_index
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (formError) {
      logger.error('Error fetching feedback form', { error: formError, formId: id });
      return res.status(404).json({ error: 'Feedback form not found' });
    }

    if (!form) {
      return res.status(404).json({ error: 'Feedback form not found' });
    }

    // Rename the questions field to match expected structure
    const formWithQuestions = {
      id: form.id,
      name: form.name,
      description: form.description,
      is_active: form.is_active,
      questions: form.feedback_questions || []
    };

    logger.info('Feedback form retrieved', { formId: id, questionCount: formWithQuestions.questions.length });

    return res.status(200).json({ form: formWithQuestions });

  } catch (error) {
    logger.error('Error in feedback form API', { error, formId: id });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}