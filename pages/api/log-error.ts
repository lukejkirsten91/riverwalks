import { NextApiRequest, NextApiResponse } from 'next';

interface ErrorLog {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  componentStack?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const errorLog: ErrorLog = req.body;
    
    // Validate required fields
    if (!errorLog.message || !errorLog.timestamp) {
      return res.status(400).json({ error: 'Missing required error information' });
    }

    // Sanitize and structure the error log
    const sanitizedLog = {
      message: errorLog.message,
      timestamp: errorLog.timestamp,
      url: errorLog.url,
      userAgent: errorLog.userAgent?.substring(0, 200), // Truncate long user agents
      hasStack: !!errorLog.stack,
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || 'unknown'
    };

    // Log to console with structured format (for Vercel logs)
    console.error('🚨 Client Error Report:', JSON.stringify(sanitizedLog, null, 2));

    // In the future, you could send to external monitoring services here:
    // - Sentry: Sentry.captureException(error)
    // - LogRocket: LogRocket.captureException(error)
    // - Custom monitoring endpoint
    
    // For now, just acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Error logged successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error logging service failed:', error);
    res.status(500).json({ 
      error: 'Failed to log error',
      timestamp: new Date().toISOString()
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb', // Limit payload size for security
    },
  },
};