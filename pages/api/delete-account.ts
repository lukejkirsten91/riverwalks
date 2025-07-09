import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the user from the authorization header
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create regular client to verify user
    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      }
    );

    // Verify the user exists and get their ID
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`🗑️ Starting account deletion for user: ${user.email} (ID: ${user.id})`);

    // Execute comprehensive user deletion using admin client
    const { data: deletionResult, error: deletionError } = await supabaseAdmin.rpc('delete_user_completely', { 
      target_user_id: user.id 
    });

    if (deletionError) {
      console.error('❌ Database deletion error:', deletionError);
      
      // Check if function doesn't exist
      if (deletionError.message.includes('function delete_user_completely') || 
          deletionError.message.includes('does not exist')) {
        throw new Error('Database function not found. Please contact support to deploy the deletion function.');
      }
      
      throw new Error(`Database deletion failed: ${deletionError.message}`);
    }

    if (deletionResult && deletionResult.length > 0) {
      const result = deletionResult[0];
      if (result.status === 'error') {
        console.error('❌ Database function error:', result.deleted_records);
        throw new Error(`Database function failed: ${result.deleted_records.error}`);
      }
      console.log('✅ Database deletion successful:', result.deleted_records);
    }

    console.log(`✅ Account deletion completed for user: ${user.email}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Account and all associated data deleted successfully' 
    });

  } catch (error) {
    console.error('❌ Error deleting account:', error);
    res.status(500).json({ 
      error: 'Failed to delete account',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}