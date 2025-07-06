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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!supabaseAdmin) {
      throw new Error('Service role key not configured');
    }

    // Create demo account
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'demo@riverwalks.co.uk',
      password: 'demo-password-2025!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Demo Account',
        avatar_url: null
      }
    });

    if (authError) {
      console.error('Error creating demo user:', authError);
      throw authError;
    }

    if (!authUser.user) {
      throw new Error('User creation failed - no user returned');
    }

    console.log('Demo account created successfully:', {
      id: authUser.user.id,
      email: authUser.user.email
    });

    return res.status(200).json({ 
      success: true, 
      userId: authUser.user.id,
      email: authUser.user.email 
    });

  } catch (error) {
    console.error('Error creating demo account:', error);
    return res.status(500).json({ 
      error: 'Failed to create demo account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}