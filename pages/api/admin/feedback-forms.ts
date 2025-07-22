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
      logger.warn('Non-admin user attempted to access feedback forms', { 
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
    logger.error('Feedback forms API error', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id, include_questions } = req.query;
  
  if (id) {
    // Get specific form with questions
    const { data: form, error: formError } = await supabaseAdmin
      .from('feedback_forms')
      .select('*')
      .eq('id', id)
      .single();
    
    if (formError) {
      logger.error('Failed to fetch feedback form', { error: formError, formId: id });
      return res.status(500).json({ error: 'Failed to fetch feedback form' });
    }

    if (!form) {
      return res.status(404).json({ error: 'Feedback form not found' });
    }

    // Get questions for this form
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('feedback_questions')
      .select('*')
      .eq('form_id', id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      logger.error('Failed to fetch feedback questions', { error: questionsError, formId: id });
      return res.status(500).json({ error: 'Failed to fetch feedback questions' });
    }

    return res.status(200).json({ 
      form: { ...form, questions: questions || [] }
    });
  }
  
  // Get all forms
  let query = supabaseAdmin.from('feedback_forms').select('*');
  
  const { data: forms, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Failed to fetch feedback forms', { error });
    return res.status(500).json({ error: 'Failed to fetch feedback forms' });
  }

  // If include_questions is true, fetch questions for each form
  if (include_questions === 'true' && forms) {
    const formsWithQuestions = await Promise.all(
      forms.map(async (form: any) => {
        const { data: questions } = await supabaseAdmin
          .from('feedback_questions')
          .select('*')
          .eq('form_id', form.id)
          .order('order_index', { ascending: true });
        
        return { ...form, questions: questions || [] };
      })
    );
    
    return res.status(200).json({ forms: formsWithQuestions });
  }
  
  return res.status(200).json({ forms: forms || [] });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { name, description, questions } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Form name is required' });
  }

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }
  
  // Validate questions
  for (const [index, question] of questions.entries()) {
    if (!question.question_text || !question.question_type) {
      return res.status(400).json({ 
        error: `Question ${index + 1} is missing required fields (question_text, question_type)` 
      });
    }
  }

  // Start transaction by creating the form first
  const { data: form, error: formError } = await supabaseAdmin
    .from('feedback_forms')
    .insert([{
      name,
      description: description || null,
      is_active: true
    }])
    .select()
    .single();
  
  if (formError) {
    logger.error('Failed to create feedback form', { error: formError });
    return res.status(500).json({ error: 'Failed to create feedback form' });
  }

  // Insert questions
  const questionsToInsert = questions.map((question, index) => ({
    form_id: form.id,
    question_text: question.question_text,
    question_type: question.question_type,
    options: question.options || {},
    order_index: question.order_index || index + 1,
    required: question.required !== false // Default to true unless explicitly false
  }));

  const { data: insertedQuestions, error: questionsError } = await supabaseAdmin
    .from('feedback_questions')
    .insert(questionsToInsert)
    .select();

  if (questionsError) {
    // Rollback form creation
    await supabaseAdmin.from('feedback_forms').delete().eq('id', form.id);
    logger.error('Failed to create feedback questions', { error: questionsError });
    return res.status(500).json({ error: 'Failed to create feedback questions' });
  }
  
  logger.info('Feedback form created', {
    adminId: user.id,
    formId: form.id,
    formName: name,
    questionCount: insertedQuestions?.length || 0
  });
  
  return res.status(201).json({ 
    form: { 
      ...form, 
      questions: insertedQuestions || [] 
    } 
  });
}

async function handlePut(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id, name, description, is_active, questions } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Form ID required' });
  }
  
  // Update form details
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;
  updateData.updated_at = new Date().toISOString();
  
  const { data: form, error: formError } = await supabaseAdmin
    .from('feedback_forms')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (formError) {
    logger.error('Failed to update feedback form', { error: formError, formId: id });
    return res.status(500).json({ error: 'Failed to update feedback form' });
  }

  // Update questions if provided
  if (questions && Array.isArray(questions)) {
    // Delete existing questions and recreate (simpler than complex update logic)
    const { error: deleteError } = await supabaseAdmin
      .from('feedback_questions')
      .delete()
      .eq('form_id', id);

    if (deleteError) {
      logger.error('Failed to delete existing questions', { error: deleteError, formId: id });
      return res.status(500).json({ error: 'Failed to update questions' });
    }

    // Insert new questions
    if (questions.length > 0) {
      const questionsToInsert = questions.map((question, index) => ({
        form_id: id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options || {},
        order_index: question.order_index || index + 1,
        required: question.required !== false
      }));

      const { data: insertedQuestions, error: questionsError } = await supabaseAdmin
        .from('feedback_questions')
        .insert(questionsToInsert)
        .select();

      if (questionsError) {
        logger.error('Failed to insert updated questions', { error: questionsError, formId: id });
        return res.status(500).json({ error: 'Failed to update questions' });
      }

      logger.info('Feedback form updated', {
        adminId: user.id,
        formId: id,
        updates: Object.keys(updateData),
        questionCount: insertedQuestions?.length || 0
      });

      return res.status(200).json({ 
        form: { 
          ...form, 
          questions: insertedQuestions || [] 
        } 
      });
    }
  }

  // Get existing questions if no questions update was provided
  const { data: existingQuestions } = await supabaseAdmin
    .from('feedback_questions')
    .select('*')
    .eq('form_id', id)
    .order('order_index', { ascending: true });
  
  logger.info('Feedback form updated', {
    adminId: user.id,
    formId: id,
    updates: Object.keys(updateData)
  });
  
  return res.status(200).json({ 
    form: { 
      ...form, 
      questions: existingQuestions || [] 
    } 
  });
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Form ID required' });
  }
  
  // Check if form has responses
  const { data: responses, error: responseCheckError } = await supabaseAdmin
    .from('feedback_responses')
    .select('id')
    .eq('form_id', id)
    .limit(1);

  if (responseCheckError) {
    logger.error('Failed to check for existing responses', { error: responseCheckError, formId: id });
    return res.status(500).json({ error: 'Failed to check form usage' });
  }

  if (responses && responses.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete form with existing responses. Consider deactivating instead.' 
    });
  }
  
  const { error } = await supabaseAdmin
    .from('feedback_forms')
    .delete()
    .eq('id', id);
  
  if (error) {
    logger.error('Failed to delete feedback form', { error, formId: id });
    return res.status(500).json({ error: 'Failed to delete feedback form' });
  }
  
  logger.info('Feedback form deleted', {
    adminId: user.id,
    formId: id
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