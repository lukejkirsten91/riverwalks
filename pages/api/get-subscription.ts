import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No user found' 
      });
    }

    console.log('🔍 Getting subscription for user:', user.email, 'ID:', user.id);

    // Try using the database function
    const { data: functionResult, error: functionError } = await supabase
      .rpc('get_user_subscription', { user_uuid: user.id });

    if (functionError) {
      console.error('❌ Function call failed:', functionError);
      
      // Fallback to direct query
      const { data: directResult, error: directError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (directError) {
        console.error('❌ Direct query also failed:', directError);
        return res.status(400).json({ 
          error: 'Subscription query failed', 
          details: directError.message,
          code: directError.code 
        });
      }

      return res.status(200).json({
        message: 'Subscription retrieved via direct query',
        subscription: directResult?.[0] || null,
        method: 'direct'
      });
    }

    return res.status(200).json({
      message: 'Subscription retrieved successfully',
      subscription: functionResult?.[0] || null,
      method: 'function'
    });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}