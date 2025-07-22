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
      logger.warn('Non-admin user attempted to send bulk email', { 
        userId: user.id,
        email: user.email 
      });
      return res.status(403).json({ error: adminError || 'Admin privileges required' });
    }

    // Validate request body
    const { emails, subject, body } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid emails array' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Missing required fields: subject, body' });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid email addresses found',
        invalid: invalidEmails
      });
    }

    // Limit to reasonable number of recipients
    if (emails.length > 500) {
      return res.status(400).json({ error: 'Too many recipients. Maximum 500 emails per bulk send.' });
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
            <p>This email was sent from Riverwalks Admin</p>
            <p style="margin: 5px 0 0;">© ${new Date().getFullYear()} Riverwalks. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    // Send bulk email using BCC
    const transporter = createTransporter();
    
    // Split into batches to avoid overwhelming the server
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let errors = [];

    // Send each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      try {
        const mailOptions = {
          from: process.env.RESEND_FROM_EMAIL || process.env.SMTP_USER || 'luke@riverwalks.co.uk',
          bcc: batch, // Using BCC so recipients can't see each other
          subject: subject,
          html: emailHtml,
          text: body, // Plain text fallback
        };

        await transporter.sendMail(mailOptions);
        totalSent += batch.length;

        logger.info(`Bulk email batch ${i + 1}/${batches.length} sent successfully`, {
          adminId: user.id,
          adminEmail: user.email,
          batchSize: batch.length,
          subject: subject
        });

        // Add small delay between batches to be respectful to email service
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (batchError) {
        logger.error(`Failed to send bulk email batch ${i + 1}`, { 
          batchError,
          batch: batch.length 
        });
        errors.push(`Batch ${i + 1}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
      }
    }

    // Log overall success
    logger.info('Bulk email campaign completed', {
      adminId: user.id,
      adminEmail: user.email,
      totalRecipients: emails.length,
      totalSent: totalSent,
      totalBatches: batches.length,
      errors: errors.length,
      subject: subject
    });

    // Return results
    if (errors.length === 0) {
      res.status(200).json({ 
        success: true, 
        message: `Bulk email sent successfully to ${totalSent} recipients`,
        recipients: totalSent,
        batches: batches.length
      });
    } else if (totalSent > 0) {
      res.status(207).json({ // 207 Multi-Status
        success: true,
        message: `Bulk email partially successful. Sent to ${totalSent} out of ${emails.length} recipients`,
        recipients: totalSent,
        batches: batches.length,
        errors: errors
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send bulk email to any recipients',
        details: errors
      });
    }

  } catch (error) {
    logger.error('Failed to send bulk email', { error });
    res.status(500).json({ 
      error: 'Failed to send bulk email',
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