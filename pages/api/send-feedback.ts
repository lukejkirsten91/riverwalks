import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

// Email configuration
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured - feedback email sending disabled');
    return null;
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const sendFeedbackEmail = async (userEmail: string, message: string, type: string): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn('Email transporter not configured - skipping feedback email');
      return false;
    }

    const mailOptions = {
      from: `"Riverwalks Feedback" <${process.env.SMTP_USER}>`,
      to: 'luke.kirsten@gmail.com',
      replyTo: userEmail,
      subject: `🌊 Riverwalks Feedback: ${type}`,
      text: `
New feedback received from Riverwalks:

Type: ${type}
From: ${userEmail}
Date: ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}

Message:
${message}

---
Reply directly to this email to respond to the user.
      `,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0;">🌊 New Riverwalks Feedback</h2>
          </div>
          
          <div style="background: white; border: 1px solid #e5e7eb; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0; color: #374151;"><strong>Type:</strong> ${type}</p>
              <p style="margin: 8px 0 0; color: #374151;"><strong>From:</strong> ${userEmail}</p>
              <p style="margin: 8px 0 0; color: #374151;"><strong>Date:</strong> ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p>
            </div>
            
            <div style="background: #fafafa; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <h3 style="margin: 0 0 10px; color: #1f2937;">Message:</h3>
              <p style="margin: 0; white-space: pre-wrap; color: #374151; line-height: 1.5;">${message}</p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 6px; border: 1px solid #bfdbfe;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">💡 <strong>Tip:</strong> Reply directly to this email to respond to the user.</p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Feedback email sent successfully:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('Failed to send feedback email:', error);
    return false;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, message, type } = req.body;

    if (!email || !message || !type) {
      return res.status(400).json({ error: 'Missing required fields: email, message, and type are required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Limit message length
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long. Please keep it under 2000 characters.' });
    }

    const success = await sendFeedbackEmail(email, message, type);
    
    if (success) {
      return res.status(200).json({ 
        success: true, 
        message: 'Feedback sent successfully. Thank you for helping improve Riverwalks!' 
      });
    } else {
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to send feedback. Please try again later.' 
      });
    }

  } catch (error) {
    console.error('Feedback API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}