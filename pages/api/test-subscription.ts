import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test subscription query
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', '92071462-23ad-4815-afa5-8ea7f54cb411');

    if (error) {
      console.error('Subscription query error:', error);
      return res.status(400).json({ 
        error: 'Subscription query failed', 
        details: error.message,
        code: error.code 
      });
    }

    return res.status(200).json({
      message: 'Subscription query successful',
      subscriptions,
      count: subscriptions?.length || 0
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}