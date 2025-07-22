import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { isUserAdmin } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
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
    // Get user session and verify admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    logger.info('Initializing feedback system', { adminId: user.id });

    // Create default welcome email template
    const { data: welcomeTemplate, error: welcomeError } = await supabaseAdmin
      .from('email_templates')
      .upsert([{
        name: 'Default Welcome Email',
        type: 'welcome',
        subject: 'Welcome to Riverwalks, {{name}}! 🌊',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Riverwalks</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8f9fa; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .content { 
            padding: 30px 20px; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
        }
        .logo { 
            font-size: 32px; 
            margin-bottom: 16px; 
        }
        .cta-button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            margin: 20px 0; 
        }
        @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header { padding: 20px 15px; }
            .content { padding: 20px 15px; }
            .footer { padding: 15px; }
            .logo { font-size: 28px; }
            .cta-button { display: block; text-align: center; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌊</div>
            <h1 style="margin: 0; font-size: 24px;">Welcome to Riverwalks, {{name}}!</h1>
        </div>
        <div class="content">
            <p style="font-size: 18px; margin-bottom: 24px;">Hi {{name}},</p>
            
            <p>I'm absolutely thrilled to welcome you to Riverwalks! You've just joined a community of passionate geography students who are transforming the way they learn about rivers and landscapes.</p>
            
            <p>Here at Riverwalks, I've poured my heart into creating something truly special - a platform that makes GCSE Geography not just easier to understand, but genuinely exciting to explore.</p>
            
            <p><strong>Here's what you can dive into right away:</strong></p>
            <ul>
                <li>🗺️ <strong>Interactive river walks</strong> with detailed geographic analysis</li>
                <li>📊 <strong>Data collection tools</strong> for your field studies</li>
                <li>📚 <strong>Educational resources</strong> aligned with your GCSE curriculum</li>
                <li>🎯 <strong>Progress tracking</strong> to monitor your learning journey</li>
            </ul>
            
            <p>I'm here to support you every step of the way. If you have any questions or just want to share how Riverwalks is helping your studies, I'd love to hear from you!</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="https://riverwalks.co.uk/river-walks" class="cta-button">Start Exploring River Walks →</a>
            </div>
            
            <p>Happy exploring!</p>
            <p style="margin-top: 30px;"><strong>Luke Kirsten</strong><br>
            <span style="color: #6b7280;">Founder & Geography Enthusiast</span><br>
            <span style="color: #6b7280;">luke@riverwalks.co.uk</span></p>
        </div>
        <div class="footer">
            <p>You're receiving this because you created an account at Riverwalks.</p>
            <p style="margin: 5px 0 0;">© 2025 Riverwalks. Made with ❤️ for geography students.</p>
        </div>
    </div>
</body>
</html>`,
        variables: ['name', 'email', 'first_name', 'last_name'],
        is_active: true
      }], { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (welcomeError) {
      logger.error('Failed to create welcome template', { error: welcomeError });
      return res.status(500).json({ error: 'Failed to create welcome template' });
    }

    // Create default feedback form
    const { data: feedbackForm, error: formError } = await supabaseAdmin
      .from('feedback_forms')
      .upsert([{
        name: 'User Experience & Satisfaction Survey',
        description: 'Help us improve Riverwalks by sharing your thoughts and experiences with the platform.',
        is_active: true
      }], { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (formError) {
      logger.error('Failed to create feedback form', { error: formError });
      return res.status(500).json({ error: 'Failed to create feedback form' });
    }

    // Create default feedback questions
    const defaultQuestions = [
      {
        form_id: feedbackForm.id,
        question_text: 'How satisfied are you with Riverwalks overall?',
        question_type: 'rating',
        options: { 
          scale: 5, 
          labels: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'] 
        },
        order_index: 1,
        required: true
      },
      {
        form_id: feedbackForm.id,
        question_text: 'How likely are you to recommend Riverwalks to a friend or classmate?',
        question_type: 'rating',
        options: { 
          scale: 10, 
          labels: ['Not at all likely', 'Extremely likely'], 
          nps: true 
        },
        order_index: 2,
        required: true
      },
      {
        form_id: feedbackForm.id,
        question_text: 'Which features do you find most valuable?',
        question_type: 'multiple_choice',
        options: { 
          options: [
            'Interactive river walks', 
            'Data collection tools', 
            'Educational resources', 
            'Progress tracking', 
            'Collaboration features'
          ],
          multiple: true 
        },
        order_index: 3,
        required: true
      },
      {
        form_id: feedbackForm.id,
        question_text: 'How often do you use Riverwalks?',
        question_type: 'multiple_choice',
        options: { 
          options: ['Daily', 'Several times a week', 'Weekly', 'Monthly', 'Rarely'] 
        },
        order_index: 4,
        required: true
      },
      {
        form_id: feedbackForm.id,
        question_text: 'What would you like to see improved or added to Riverwalks?',
        question_type: 'text',
        options: { 
          placeholder: 'Share your suggestions for new features or improvements...' 
        },
        order_index: 5,
        required: false
      },
      {
        form_id: feedbackForm.id,
        question_text: 'Would you like to share a brief testimonial about your Riverwalks experience?',
        question_type: 'text',
        options: { 
          placeholder: 'Feel free to share what you love about Riverwalks...' 
        },
        order_index: 6,
        required: false
      }
    ];

    // Delete existing questions for this form first
    await supabaseAdmin
      .from('feedback_questions')
      .delete()
      .eq('form_id', feedbackForm.id);

    // Insert new questions
    const { error: questionsError } = await supabaseAdmin
      .from('feedback_questions')
      .insert(defaultQuestions);

    if (questionsError) {
      logger.error('Failed to create feedback questions', { error: questionsError });
      return res.status(500).json({ error: 'Failed to create feedback questions' });
    }

    // Create newsletter template for bulk emails
    const { data: newsletterTemplate, error: newsletterError } = await supabaseAdmin
      .from('email_templates')
      .upsert([{
        name: 'Newsletter Template',
        type: 'newsletter',
        subject: 'Updates from Riverwalks',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Riverwalks Newsletter</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
            background-color: #f8f9fa; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
        }
        .header { 
            background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
        }
        .content { 
            padding: 30px 20px; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
        }
        @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
            .header { padding: 20px 15px; }
            .content { padding: 20px 15px; }
            .footer { padding: 15px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 24px;">🌊 Riverwalks Newsletter</h1>
        </div>
        <div class="content">
            <p>Hi {{name}},</p>
            <p>{{content}}</p>
            <p>Best regards,<br>
            <strong>Luke Kirsten</strong><br>
            Riverwalks Team</p>
        </div>
        <div class="footer">
            <p>© 2025 Riverwalks. Made with ❤️ for geography students.</p>
        </div>
    </div>
</body>
</html>`,
        variables: ['name', 'email', 'content'],
        is_active: true
      }], { 
        onConflict: 'name',
        ignoreDuplicates: false 
      })
      .select();

    if (newsletterError) {
      logger.error('Failed to create newsletter template', { error: newsletterError });
    }

    logger.info('Feedback system initialized successfully', { 
      adminId: user.id,
      welcomeTemplateId: welcomeTemplate?.[0]?.id,
      feedbackFormId: feedbackForm.id,
      newsletterTemplateId: newsletterTemplate?.[0]?.id
    });

    res.status(200).json({ 
      success: true, 
      message: 'Feedback system initialized successfully',
      data: {
        welcomeTemplate: welcomeTemplate?.[0],
        feedbackForm: feedbackForm,
        newsletterTemplate: newsletterTemplate?.[0]
      }
    });

  } catch (error) {
    logger.error('Failed to initialize feedback system', { error });
    res.status(500).json({ 
      error: 'Failed to initialize feedback system',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}