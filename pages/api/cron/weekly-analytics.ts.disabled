import { NextApiRequest, NextApiResponse } from 'next';

// This endpoint will be called by Vercel Cron Jobs weekly
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify this is a cron request (security)
  const authHeader = req.headers.authorization;
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕒 Running weekly analytics report cron job');

    // Generate and send weekly report to Luke
    const reportResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/analytics/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        period: '7d',
        email: 'luke.kirsten@gmail.com',
        type: 'scheduled'
      })
    });

    const reportResult = await reportResponse.json();

    if (reportResult.success) {
      console.log('✅ Weekly analytics report sent successfully');
      
      res.status(200).json({
        success: true,
        message: 'Weekly analytics report sent',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Weekly report failed:', reportResult.error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to send weekly report',
        details: reportResult.error
      });
    }

  } catch (error) {
    console.error('❌ Cron job error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Cron job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Prevent this from running on every request
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}