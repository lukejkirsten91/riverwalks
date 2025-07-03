import { NextApiRequest, NextApiResponse } from 'next';

interface ActionLog {
  action: string;
  metadata?: Record<string, any>;
  timestamp: number;
  url: string;
  userAgent?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const actionLog: ActionLog = req.body;
    
    // Validate required fields
    if (!actionLog.action || !actionLog.timestamp) {
      return res.status(400).json({ error: 'Missing required action data' });
    }

    // Sanitize and structure the action log (no personal data)
    const sanitizedLog = {
      action: actionLog.action,
      page: actionLog.url,
      timestamp: new Date(actionLog.timestamp).toISOString(),
      metadata: actionLog.metadata || {},
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Only log important user actions to avoid spam
    const importantActions = [
      'subscription_purchase',
      'premium_feature_attempted',
      'report_generated',
      'data_exported',
      'collaboration_invited',
      'error_encountered'
    ];

    const shouldLog = importantActions.some(action => 
      actionLog.action.includes(action)
    );

    if (shouldLog) {
      console.log('👤 User Action Analytics:', JSON.stringify(sanitizedLog, null, 2));
    }

    // In the future, you could send to analytics platforms:
    // - Vercel Analytics custom events
    // - Google Analytics 4 events
    // - Mixpanel or Amplitude
    // - Custom analytics dashboard
    
    res.status(200).json({ 
      success: true, 
      message: 'Action logged successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Action logging failed:', error);
    res.status(500).json({ 
      error: 'Failed to log action',
      timestamp: new Date().toISOString()
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb', // Small payload for action data
    },
  },
};