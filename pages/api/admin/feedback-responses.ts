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

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    switch (req.method) {
      case 'GET':
        // Admin only for viewing responses
        const { isAdmin, error: adminError } = await requireAdmin(user.id);
        if (!isAdmin) {
          return res.status(403).json({ error: adminError || 'Admin privileges required' });
        }
        return handleGet(req, res, supabaseAdmin, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    logger.error('Feedback responses API error', { error });
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { form_id, campaign_id, analytics } = req.query;
  
  // If analytics is requested, return aggregated data
  if (analytics === 'true') {
    return handleAnalytics(req, res, supabaseAdmin, user);
  }
  
  // Build query for individual responses
  let query = supabaseAdmin
    .from('feedback_responses')
    .select(`
      *,
      feedback_forms:form_id (
        id,
        name
      ),
      feedback_campaigns:campaign_id (
        id,
        name
      )
    `);
  
  if (form_id) {
    query = query.eq('form_id', form_id);
  }
  
  if (campaign_id) {
    query = query.eq('campaign_id', campaign_id);
  }
  
  const { data: responses, error } = await query.order('submitted_at', { ascending: false });
  
  if (error) {
    logger.error('Failed to fetch feedback responses', { error });
    return res.status(500).json({ error: 'Failed to fetch feedback responses' });
  }
  
  return res.status(200).json({ responses: responses || [] });
}

async function handleAnalytics(req: NextApiRequest, res: NextApiResponse, supabaseAdmin: any, user: any) {
  const { form_id, campaign_id } = req.query;
  
  try {
    // Build base query conditions
    let whereClause = '1=1';
    const queryParams = [];
    
    if (form_id) {
      whereClause += ' AND form_id = $' + (queryParams.length + 1);
      queryParams.push(form_id);
    }
    
    if (campaign_id) {
      whereClause += ' AND campaign_id = $' + (queryParams.length + 1);
      queryParams.push(campaign_id);
    }

    // Get total response count
    const { data: totalCount } = await supabaseAdmin
      .from('feedback_responses')
      .select('id', { count: 'exact' })
      .eq(form_id ? 'form_id' : 'id', form_id || 'id')
      .neq('id', ''); // Always true condition when form_id not specified

    // Get responses with details for analysis
    let responseQuery = supabaseAdmin
      .from('feedback_responses')
      .select(`
        responses,
        submitted_at,
        user_name,
        user_email,
        feedback_forms:form_id (
          id,
          name
        ),
        feedback_campaigns:campaign_id (
          id,
          name
        )
      `);

    if (form_id) {
      responseQuery = responseQuery.eq('form_id', form_id);
    }
    
    if (campaign_id) {
      responseQuery = responseQuery.eq('campaign_id', campaign_id);
    }

    const { data: responses, error: responsesError } = await responseQuery
      .order('submitted_at', { ascending: false });

    if (responsesError) {
      logger.error('Failed to fetch responses for analytics', { error: responsesError });
      return res.status(500).json({ error: 'Failed to fetch responses for analytics' });
    }

    // Get form details and questions for proper analysis
    const formIds = [...new Set((responses || []).map((r: any) => r.feedback_forms?.id).filter(Boolean))];
    
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('feedback_forms')
      .select(`
        id,
        name,
        feedback_questions (
          id,
          question_text,
          question_type,
          options,
          order_index
        )
      `)
      .in('id', formIds);

    if (formsError) {
      logger.error('Failed to fetch forms for analytics', { error: formsError });
    }

    // Process analytics
    const analytics = processResponseAnalytics(responses || [], forms || []);
    
    return res.status(200).json({ 
      analytics: {
        ...analytics,
        totalResponses: totalCount?.[0] || 0,
        responsesByForm: getResponsesByForm(responses || []),
        responsesByDate: getResponsesByDate(responses || [])
      }
    });

  } catch (error) {
    logger.error('Error processing analytics', { error });
    return res.status(500).json({ error: 'Failed to process analytics' });
  }
}

function processResponseAnalytics(responses: any[], forms: any[]) {
  const analytics: any = {
    totalResponses: responses.length,
    questionAnalytics: {},
    npsScore: null,
    satisfactionMetrics: {},
    keyMetrics: {}
  };

  if (responses.length === 0) {
    return analytics;
  }

  // Create question lookup
  const questionMap = new Map();
  forms.forEach(form => {
    if (form.feedback_questions) {
      form.feedback_questions.forEach((q: any) => {
        questionMap.set(q.id, q);
      });
    }
  });

  // Process each response
  responses.forEach(response => {
    if (response.responses && Array.isArray(response.responses)) {
      response.responses.forEach((answer: any) => {
        const question = questionMap.get(answer.question_id);
        if (!question) return;

        const questionId = answer.question_id;
        
        if (!analytics.questionAnalytics[questionId]) {
          analytics.questionAnalytics[questionId] = {
            question: question.question_text,
            type: question.question_type,
            responses: [],
            average: null,
            distribution: {},
            totalResponses: 0
          };
        }

        const questionAnalytic = analytics.questionAnalytics[questionId];
        questionAnalytic.responses.push(answer.answer);
        questionAnalytic.totalResponses++;

        // Process by question type
        if (question.question_type === 'rating') {
          const rating = parseFloat(answer.answer);
          if (!isNaN(rating)) {
            if (!questionAnalytic.ratings) questionAnalytic.ratings = [];
            questionAnalytic.ratings.push(rating);
            
            // Check if this is NPS (scale of 10)
            if (question.options?.nps || question.options?.scale === 10) {
              if (!analytics.npsResponses) analytics.npsResponses = [];
              analytics.npsResponses.push(rating);
            }
            
            // Track for satisfaction metrics
            if (question.question_text.toLowerCase().includes('satisfied')) {
              if (!analytics.satisfactionRatings) analytics.satisfactionRatings = [];
              analytics.satisfactionRatings.push(rating);
            }
          }
        } else if (question.question_type === 'multiple_choice') {
          if (!questionAnalytic.distribution[answer.answer]) {
            questionAnalytic.distribution[answer.answer] = 0;
          }
          questionAnalytic.distribution[answer.answer]++;
        }
      });
    }
  });

  // Calculate averages and NPS
  Object.values(analytics.questionAnalytics).forEach((q: any) => {
    if (q.ratings && q.ratings.length > 0) {
      q.average = q.ratings.reduce((a: number, b: number) => a + b, 0) / q.ratings.length;
    }
  });

  // Calculate NPS Score
  if (analytics.npsResponses && analytics.npsResponses.length > 0) {
    const promoters = analytics.npsResponses.filter((score: number) => score >= 9).length;
    const detractors = analytics.npsResponses.filter((score: number) => score <= 6).length;
    const total = analytics.npsResponses.length;
    analytics.npsScore = Math.round(((promoters - detractors) / total) * 100);
  }

  // Calculate satisfaction metrics
  if (analytics.satisfactionRatings && analytics.satisfactionRatings.length > 0) {
    const avgSatisfaction = analytics.satisfactionRatings.reduce((a: number, b: number) => a + b, 0) / analytics.satisfactionRatings.length;
    analytics.satisfactionMetrics = {
      average: Math.round(avgSatisfaction * 100) / 100,
      satisfied: analytics.satisfactionRatings.filter((r: number) => r >= 4).length,
      dissatisfied: analytics.satisfactionRatings.filter((r: number) => r <= 2).length,
      total: analytics.satisfactionRatings.length
    };
  }

  return analytics;
}

function getResponsesByForm(responses: any[]) {
  const byForm = responses.reduce((acc, response) => {
    const formName = response.feedback_forms?.name || 'Unknown Form';
    if (!acc[formName]) {
      acc[formName] = 0;
    }
    acc[formName]++;
    return acc;
  }, {});
  
  return byForm;
}

function getResponsesByDate(responses: any[]) {
  const byDate = responses.reduce((acc, response) => {
    const date = new Date(response.submitted_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = 0;
    }
    acc[date]++;
    return acc;
  }, {});
  
  // Sort by date
  const sortedEntries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(sortedEntries);
}

// Helper function for admin check
async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin privileges required' };
  }
  return { isAdmin: true };
}