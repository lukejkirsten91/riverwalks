import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('Auth callback received:', req.query);

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

  // Check for original redirect URL in the request
  // Supabase typically preserves this in the 'next' parameter or referrer
  let redirectUrl = '/river-walks'; // Default fallback
  
  // Check if this is a collaboration invite redirect
  const referrer = req.headers.referer || req.headers.referrer;
  if (referrer && typeof referrer === 'string' && referrer.includes('/invite/')) {
    // Extract the invite token from referrer and redirect back to invite page
    const inviteMatch = referrer.match(/\/invite\/([^?&#]+)/);
    if (inviteMatch) {
      redirectUrl = `/invite/${inviteMatch[1]}`;
      console.log('Redirecting back to invite page:', redirectUrl);
    }
  }

  // Check for explicit next parameter (some OAuth implementations use this)
  const nextParam = req.query.next;
  if (nextParam && typeof nextParam === 'string' && nextParam.includes('/invite/')) {
    redirectUrl = nextParam;
    console.log('Using next parameter for redirect:', redirectUrl);
  }

  console.log('Final redirect URL:', redirectUrl);
  res.redirect(redirectUrl);
}
