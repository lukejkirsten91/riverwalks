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
    // Check what the API query returns vs direct table query
    const { data: allAgreements, error: allError } = await supabaseAdmin
      .from('user_agreements')
      .select('*');

    const { data: consentedAgreements, error: consentError } = await supabaseAdmin
      .from('user_agreements')
      .select('*')
      .eq('marketing_consent', true);

    const { data: apiQuery, error: apiError } = await supabaseAdmin
      .from('user_agreements')
      .select('user_id, marketing_consent, terms_accepted_at');

    const summary = {
      all_agreements_count: allAgreements?.length || 0,
      consented_agreements_count: consentedAgreements?.length || 0,
      api_query_count: apiQuery?.length || 0,
      api_consented_count: apiQuery?.filter(a => a.marketing_consent === true).length || 0,
      errors: {
        allError: allError?.message,
        consentError: consentError?.message,
        apiError: apiError?.message
      }
    };

    return res.status(200).json({
      summary,
      all_agreements: allAgreements,
      consented_agreements: consentedAgreements,
      api_query_results: apiQuery,
      api_consented_only: apiQuery?.filter(a => a.marketing_consent === true)
    });

  } catch (error) {
    return res.status(500).json({ 
      error: 'Failed to debug agreements',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}