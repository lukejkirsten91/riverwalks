import { NextApiRequest, NextApiResponse } from 'next';
import { sendWelcomeEmail, testEmailConfiguration } from '../../lib/email';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, email } = req.body;

    if (action === 'test-config') {
      // Test email configuration
      const isValid = await testEmailConfiguration();
      return res.status(200).json({ 
        success: isValid,
        message: isValid ? 'Email configuration is valid' : 'Email configuration failed'
      });
    }

    if (action === 'send-welcome' && email) {
      // Send test welcome email
      const success = await sendWelcomeEmail(email);
      return res.status(200).json({ 
        success,
        message: success ? 'Welcome email sent successfully' : 'Failed to send welcome email'
      });
    }

    return res.status(400).json({ error: 'Invalid action or missing email' });

  } catch (error) {
    console.error('Email test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}