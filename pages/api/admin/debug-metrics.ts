import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured');
    }

    // Check if demo user exists
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const demoUser = allUsers?.users?.find(u => u.email === 'demo@riverwalks.co.uk');
    
    console.log('Demo user found:', demoUser ? { id: demoUser.id, email: demoUser.email } : 'NOT FOUND');

    // Get total river walks without filtering
    const { count: totalRiverWalks, error: totalError } = await supabaseAdmin
      .from('river_walks')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false);

    if (totalError) {
      console.error('Error fetching total river walks:', totalError);
    }

    // Get demo river walks specifically
    const { data: demoRiverWalks, error: demoError } = await supabaseAdmin
      .from('river_walks')
      .select('*')
      .eq('user_id', '64ff3cca-bdab-408f-806b-c42e755cef53');

    if (demoError) {
      console.error('Error fetching demo river walks:', demoError);
    }

    return res.status(200).json({ 
      success: true,
      debug: {
        demoUserExists: !!demoUser,
        demoUserId: demoUser?.id,
        totalRiverWalks: totalRiverWalks,
        demoRiverWalks: demoRiverWalks,
        demoRiverWalksCount: demoRiverWalks?.length
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}