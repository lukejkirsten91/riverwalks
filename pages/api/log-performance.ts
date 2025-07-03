import { NextApiRequest, NextApiResponse } from 'next';

interface PerformanceLog {
  name: string;
  value: number;
  timestamp: number;
  url: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const performanceLog: PerformanceLog = req.body;
    
    // Validate required fields
    if (!performanceLog.name || typeof performanceLog.value !== 'number') {
      return res.status(400).json({ error: 'Missing required performance data' });
    }

    // Sanitize and structure the performance log
    const sanitizedLog = {
      metric: performanceLog.name,
      duration: Math.round(performanceLog.value),
      page: performanceLog.url,
      timestamp: new Date(performanceLog.timestamp).toISOString(),
      environment: process.env.NODE_ENV || 'unknown'
    };

    // Only log significant performance issues to avoid log spam
    const isSignificantMetric = 
      performanceLog.value > 2000 || // Slow operations (>2s)
      performanceLog.name.includes('error') || // Errors
      performanceLog.name.includes('navigation'); // Page loads

    if (isSignificantMetric) {
      console.log('📊 Performance Alert:', JSON.stringify(sanitizedLog, null, 2));
    }

    // In the future, you could aggregate and send to monitoring services:
    // - Send to Vercel Analytics
    // - Forward to external APM tools
    // - Store in database for trending analysis
    
    res.status(200).json({ 
      success: true, 
      message: 'Performance data logged',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Performance logging failed:', error);
    res.status(500).json({ 
      error: 'Failed to log performance data',
      timestamp: new Date().toISOString()
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '64kb', // Small payload for performance data
    },
  },
};