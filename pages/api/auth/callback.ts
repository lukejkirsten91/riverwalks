import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Auth callback received:', {
    query: req.query,
    headers: {
      referer: req.headers.referer,
      referrer: req.headers.referrer
    }
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { code } = req.query;
  const codeString = Array.isArray(code) ? code[0] : code;

  if (codeString) {
    try {
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(codeString);
      if (error) {
        console.error('Error exchanging code for session:', error);
      } else {
        console.log('Session established successfully');
      }
    } catch (error) {
      console.error('Exception during code exchange:', error);
    }
  }

  // Always redirect to river-walks after OAuth
  // Any pending invite tokens will be processed automatically there
  console.log('OAuth completed, redirecting to river-walks');
  res.redirect('/river-walks');
}
