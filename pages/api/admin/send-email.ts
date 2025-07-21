import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import { supabase } from '../../../lib/supabase';
import { isUserAdmin } from '../../../lib/auth';
import { logger } from '../../../lib/logger';

// Email configuration
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP credentials not configured');
  }
  
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

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

    // Check admin privileges
    const { isAdmin, error: adminError } = await requireAdmin(user.id);
    if (!isAdmin) {
      logger.warn('Non-admin user attempted to send email', { 
        userId: user.id,
        email: user.email 
      });
      return res.status(403).json({ error: adminError || 'Admin privileges required' });
    }

    // Validate request body
    const { to, subject, body } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, body' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    // Create email template
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
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
            padding: 30px; 
            text-align: center; 
        }
        .content { 
            padding: 30px; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px 30px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px; 
        }
        .logo { 
            font-size: 24px; 
            margin-bottom: 10px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌊</div>
            <h1 style="margin: 0; font-size: 24px;">${subject}</h1>
        </div>
        <div class="content">
            <div style="white-space: pre-line; font-size: 16px;">${body}</div>
        </div>
        <div class="footer">
            <p>This email was sent from Riverwalks Admin Dashboard</p>
            <p style="margin: 5px 0 0;">© ${new Date().getFullYear()} Riverwalks. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    // Send email
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: to,
      subject: subject,
      html: emailHtml,
      text: body, // Plain text fallback
    };

    await transporter.sendMail(mailOptions);

    logger.info('Admin email sent successfully', {
      adminId: user.id,
      adminEmail: user.email,
      recipientEmail: to,
      subject: subject
    });

    res.status(200).json({ 
      success: true, 
      message: 'Email sent successfully' 
    });

  } catch (error) {
    logger.error('Failed to send admin email', { error });
    res.status(500).json({ 
      error: 'Failed to send email',
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