import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check environment variables
    const config = {
      SMTP_HOST: process.env.SMTP_HOST || 'not set',
      SMTP_PORT: process.env.SMTP_PORT || 'not set',
      SMTP_USER: process.env.SMTP_USER ? 'configured' : 'not set',
      SMTP_PASS: process.env.SMTP_PASS ? 'configured' : 'not set',
    };

    console.log('SMTP Configuration:', config);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(200).json({ 
        status: 'error',
        message: 'SMTP credentials not configured',
        config
      });
    }

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();

    return res.status(200).json({ 
      status: 'success',
      message: 'SMTP connection successful',
      config
    });

  } catch (error) {
    console.error('SMTP test error:', error);
    return res.status(200).json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error
    });
  }
}