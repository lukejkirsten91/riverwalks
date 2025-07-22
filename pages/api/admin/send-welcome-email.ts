import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
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

// Email configuration
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured');
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASS,
    },
  });
};

// Function to replace template variables
function replaceVariables(template: string, variables: { [key: string]: string }): string {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userEmail, userName, templateId, manual } = req.body;
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Admin client not configured' });
    }

    // If manual is true, require admin auth
    if (manual) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid authentication' });
      }

      const { isAdmin, error: adminError } = await requireAdmin(user.id);
      if (!isAdmin) {
        return res.status(403).json({ error: adminError || 'Admin privileges required' });
      }
    }

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields: userId, userEmail' });
    }

    // Get the active welcome email template
    let templateQuery = supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('type', 'welcome')
      .eq('is_active', true);
    
    if (templateId) {
      templateQuery = templateQuery.eq('id', templateId);
    }
    
    const { data: templates, error: templateError } = await templateQuery
      .order('created_at', { ascending: false })
      .limit(1);

    if (templateError) {
      logger.error('Failed to fetch welcome email template', { templateError });
      return res.status(500).json({ error: 'Failed to fetch email template' });
    }

    if (!templates || templates.length === 0) {
      logger.error('No active welcome email template found');
      return res.status(404).json({ error: 'No active welcome email template found' });
    }

    const template = templates[0];

    // Prepare template variables
    const templateVars = {
      name: userName || userEmail.split('@')[0],
      email: userEmail,
      first_name: userName?.split(' ')[0] || userEmail.split('@')[0],
      last_name: userName?.split(' ').slice(1).join(' ') || '',
      site_url: 'https://riverwalks.co.uk'
    };

    // Replace variables in subject and content
    const subject = replaceVariables(template.subject, templateVars);
    const content = replaceVariables(template.content, templateVars);

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'luke@riverwalks.co.uk',
      to: userEmail,
      subject: subject,
      html: content,
      text: content.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    await transporter.sendMail(mailOptions);

    logger.info('Welcome email sent successfully', {
      userId,
      userEmail,
      userName,
      templateId: template.id,
      templateName: template.name,
      manual: manual || false
    });

    res.status(200).json({ 
      success: true, 
      message: 'Welcome email sent successfully',
      templateUsed: {
        id: template.id,
        name: template.name
      }
    });

  } catch (error) {
    logger.error('Failed to send welcome email', { error, body: req.body });
    res.status(500).json({ 
      error: 'Failed to send welcome email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Helper function for admin check
async function requireAdmin(userId: string): Promise<{ isAdmin: boolean, error?: string }> {
  const isAdmin = await isUserAdmin(userId);
  
  if (!isAdmin) {
    return { isAdmin: false, error: 'Admin privileges required' };
  }
  return { isAdmin: true };
}