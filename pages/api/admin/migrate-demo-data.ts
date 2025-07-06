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

    const demoUserId = '64ff3cca-bdab-408f-806b-c42e755cef53';
    
    // Get luke.kirsten@gmail.com user ID
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const lukeUser = allUsers?.users?.find(u => u.email === 'luke.kirsten@gmail.com');
    
    if (!lukeUser) {
      throw new Error('Could not find luke.kirsten@gmail.com user');
    }

    console.log('Found Luke user:', lukeUser.id);

    // First, run the demo data creation script directly
    const createDemoDataQuery = `
      -- Insert demo river walk
      INSERT INTO river_walks (id, name, date, country, county, user_id, archived, notes) 
      VALUES (
        '72618ab0-5079-43e3-a4ea-bbdb773196d9',
        'River Dart Interactive Demo',
        '2024-06-15',
        'UK',
        'Devon',
        '${demoUserId}',
        false,
        'Demonstration river walk for interactive preview feature. Contains 5 pre-filled sites with realistic data from the River Dart in Devon.'
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        name = EXCLUDED.name,
        notes = EXCLUDED.notes;
    `;

    const { error: riverWalkError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: createDemoDataQuery 
    });

    if (riverWalkError) {
      console.error('Error creating demo river walk:', riverWalkError);
      // Continue anyway, might already exist
    }

    // Update existing sites to belong to demo account
    const updateSitesQuery = `
      UPDATE sites 
      SET river_walk_id = '72618ab0-5079-43e3-a4ea-bbdb773196d9'
      WHERE river_walk_id IN (
        SELECT id FROM river_walks WHERE user_id = '${lukeUser.id}' AND name ILIKE '%dart%'
      );
    `;

    const { error: sitesError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: updateSitesQuery 
    });

    if (sitesError) {
      console.error('Error updating sites:', sitesError);
    }

    // Transfer ownership of River Dart walks to demo account
    const transferQuery = `
      UPDATE river_walks 
      SET user_id = '${demoUserId}'
      WHERE user_id = '${lukeUser.id}' AND name ILIKE '%dart%';
    `;

    const { error: transferError } = await supabaseAdmin.rpc('exec_sql', { 
      sql: transferQuery 
    });

    if (transferError) {
      console.error('Error transferring river walks:', transferError);
    }

    // Verify the migration
    const { data: demoRiverWalks, error: verifyError } = await supabaseAdmin
      .from('river_walks')
      .select('id, name, user_id')
      .eq('user_id', demoUserId);

    if (verifyError) {
      throw verifyError;
    }

    console.log('Migration completed. Demo account now owns:', demoRiverWalks);

    return res.status(200).json({ 
      success: true, 
      message: 'River Dart data migrated to demo account',
      demoRiverWalks: demoRiverWalks
    });

  } catch (error) {
    console.error('Error migrating demo data:', error);
    return res.status(500).json({ 
      error: 'Failed to migrate demo data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}