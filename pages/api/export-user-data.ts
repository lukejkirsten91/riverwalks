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

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      }
    );

    // Verify the user exists and get their ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log(`📁 Starting data export for user: ${user.email} (ID: ${user.id})`);

    // Gather all user data
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        userEmail: user.email,
        userId: user.id,
        note: 'This is a complete export of your Riverwalks data'
      },
      account: {
        email: user.email,
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at,
        provider: user.app_metadata?.provider
      },
      riverWalks: [] as any[],
      subscription: null,
      userAgreements: [] as any[],
      collaborations: {
        owned: [] as any[],
        participated: [] as any[]
      }
    };

    // Get river walks
    const { data: riverWalks } = await supabase
      .from('river_walks')
      .select(`
        *,
        sites (
          *,
          measurement_points (*)
        )
      `)
      .eq('user_id', user.id);

    exportData.riverWalks = riverWalks || [];

    // Get subscription data
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    exportData.subscription = subscription;

    // Get user agreements
    const { data: agreements } = await supabase
      .from('user_agreements')
      .select('*')
      .eq('user_id', user.id);

    exportData.userAgreements = agreements || [];

    // Get collaboration data (if available)
    try {
      // Collaborations owned by user
      const { data: ownedCollaborations } = await supabase
        .from('collaboration_metadata')
        .select(`
          *,
          collaborator_access (*)
        `)
        .eq('owner_id', user.id);

      exportData.collaborations.owned = ownedCollaborations || [];

      // Collaborations participated in
      const { data: participatedCollaborations } = await supabase
        .from('collaborator_access')
        .select(`
          *,
          collaboration_metadata (*)
        `)
        .eq('user_email', user.email)
        .not('accepted_at', 'is', null);

      exportData.collaborations.participated = participatedCollaborations || [];
    } catch (error) {
      // Collaboration features might not be available
      console.log('Collaboration data not available for export');
    }

    console.log(`✅ Data export completed for user: ${user.email}`);

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="riverwalks-data-${user.id}.json"`);
    res.status(200).json(exportData);

  } catch (error) {
    console.error('❌ Error exporting user data:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}