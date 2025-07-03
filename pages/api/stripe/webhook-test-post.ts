import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🧪 Test endpoint called:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  return res.status(200).json({
    success: true,
    message: 'POST method working',
    timestamp: new Date().toISOString()
  });
}