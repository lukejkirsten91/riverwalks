import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
  : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Admin client not configured' });
  }

  try {
    // Get all users
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    
    // Get user agreements
    const { data: agreementsData } = await supabaseAdmin
      .from('user_agreements')
      .select('user_id, marketing_consent, terms_accepted_at');

    const results = usersData.users.map(user => {
      const agreement = agreementsData?.find(a => a.user_id === user.id);
      const metadata = user.user_metadata || {};
      
      return {
        email: user.email,
        agreement_consent: agreement?.marketing_consent,
        metadata_consent: metadata.marketing_consent,
        metadata_type: typeof metadata.marketing_consent,
        has_agreement: !!agreement,
        final_consent: agreement?.marketing_consent || 
                      metadata.marketing_consent === true ||
                      metadata.marketing_consent === 'true'
      };
    });

    const summary = {
      total_users: results.length,
      users_with_agreements: results.filter(r => r.has_agreement).length,
      agreement_consent_true: results.filter(r => r.agreement_consent === true).length,
      metadata_consent_true: results.filter(r => r.metadata_consent === true).length,
      metadata_consent_string_true: results.filter(r => r.metadata_consent === 'true').length,
      final_consent_count: results.filter(r => r.final_consent).length
    };

    return res.status(200).json({
      summary,
      users: results
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to debug marketing consent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}