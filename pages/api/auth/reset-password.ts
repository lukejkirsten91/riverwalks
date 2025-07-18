import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransporter(emailConfig);
};

const getResetEmailHtml = (resetLink: string, userEmail: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Riverwalks Password</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 16px; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
            <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Let's get you back into your account</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1e40af; margin-top: 0;">Password Reset Request</h2>
            
            <p>Hi there!</p>
            
            <p>We received a request to reset the password for your Riverwalks account associated with <strong>${userEmail}</strong>.</p>
            
            <p>Click the button below to choose a new password:</p>
            
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Your Password</a>
            </div>
            
            <div class="warning">
                <p style="margin: 0; color: #92400e;"><strong>⏰ This link expires in 1 hour</strong></p>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px;">For security reasons, this reset link will only work once and expires in 60 minutes.</p>
            </div>
            
            <h3 style="color: #1e40af;">Didn't request this?</h3>
            <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            
            <p style="margin-top: 32px;">Best regards,<br><strong>The Riverwalks Team</strong> 🌊</p>
        </div>
        
        <div class="footer">
            <p>© 2025 Riverwalks. All rights reserved.</p>
            <p style="margin: 8px 0 0;">If you're having trouble clicking the button, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #3b82f6; font-size: 12px;">${resetLink}</p>
        </div>
    </div>
</body>
</html>
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // Check if user exists first
    const { data: users, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (lookupError) {
      console.error('Error looking up user:', lookupError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!users || users.length === 0) {
      // For security, we don't reveal if email exists or not
      return res.status(200).json({ message: 'If an account with that email exists, we have sent a password reset link.' });
    }

    // Generate a secure token (in production, you'd want to store this in the database with expiration)
    const resetToken = crypto.randomUUID();
    const resetLink = `https://www.riverwalks.co.uk/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email using custom email service
    const transporter = createTransporter();
    
    if (!transporter) {
      console.error('Email transporter not configured');
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const mailOptions = {
      from: `"Riverwalks" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 Reset Your Riverwalks Password',
      html: getResetEmailHtml(resetLink, email),
    };

    await transporter.sendMail(mailOptions);
    
    console.log('Password reset email sent successfully to:', email);
    
    return res.status(200).json({ 
      message: 'If an account with that email exists, we have sent a password reset link.' 
    });

  } catch (error) {
    console.error('Error sending password reset email:', error);
    return res.status(500).json({ error: 'Failed to send password reset email' });
  }
}