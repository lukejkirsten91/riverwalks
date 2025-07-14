import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendWelcomeEmail } from '../../../lib/email';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('OAuth callback received:', { method: req.method, query: req.query, headers: req.headers.referer });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { code } = req.query;
  const codeString = Array.isArray(code) ? code[0] : code;
  console.log('OAuth code received:', !!codeString);

  if (codeString) {
    try {
      console.log('Exchanging OAuth code for session...');
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(codeString);
      if (error) {
        console.error('Error exchanging code for session:', error);
        console.error('Error details:', { message: error.message, status: error.status });
      } else {
        console.log('Session exchange successful:', { user: data?.user?.email, provider: data?.user?.app_metadata?.provider });
        // Check if this is a new user and send welcome email
        if (data?.user && data?.session) {
          const user = data.user;
          const userEmail = user.email;
          
          // Check if user was created recently (within last 10 minutes to account for OAuth delays)
          const userCreatedAt = new Date(user.created_at);
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const isNewUser = userCreatedAt > tenMinutesAgo;
          
          if (isNewUser && userEmail) {
            // Send welcome email asynchronously (don't block the redirect)
            sendWelcomeEmail(userEmail).catch((emailError) => {
              console.error('Welcome email error:', emailError);
            });
          }
        }
      }
    } catch (error) {
      console.error('Exception during code exchange:', error);
    }
  }

  // Check for redirect_to parameter, default to river-walks
  const redirectTo = typeof req.query.redirect_to === 'string' ? req.query.redirect_to : '/river-walks';
  
  console.log('OAuth completed, redirecting to:', redirectTo);
  res.redirect(redirectTo);
}
