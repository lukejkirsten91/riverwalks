import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧪 Test PDF API called');
  console.log('📝 Request method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test basic functionality
    const { riverWalkId } = req.body;
    
    if (!riverWalkId) {
      return res.status(400).json({ error: 'River walk ID is required' });
    }

    console.log('✅ Basic validation passed');
    console.log('🔍 River walk ID:', riverWalkId);
    
    // Test environment
    console.log('🌍 Environment info:', {
      nodeEnv: process.env.NODE_ENV,
      vercelRegion: process.env.VERCEL_REGION,
      runtime: process.version
    });

    // Simulate PDF generation success
    return res.status(200).json({ 
      success: true, 
      message: 'PDF API test successful',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test API error:', error);
    return res.status(500).json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}