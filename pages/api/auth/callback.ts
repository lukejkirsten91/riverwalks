import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendWelcomeEmail } from '../../../lib/email';

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
        
        // Check if this is a new user and send welcome email
        if (data?.user && data?.session) {
          const user = data.user;
          const userEmail = user.email;
          
          // Check if user was created recently (within last 5 minutes)
          // This helps identify if this is a new signup vs returning login
          const userCreatedAt = new Date(user.created_at);
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          
          const isNewUser = userCreatedAt > fiveMinutesAgo;
          
          if (isNewUser && userEmail) {
            console.log('🎉 New user detected, sending welcome email to:', userEmail);
            
            // Send welcome email asynchronously (don't block the redirect)
            sendWelcomeEmail(userEmail).then((success) => {
              if (success) {
                console.log('✅ Welcome email sent successfully to:', userEmail);
              } else {
                console.log('❌ Failed to send welcome email to:', userEmail);
              }
            }).catch((emailError) => {
              console.error('❌ Welcome email error:', emailError);
            });
          } else {
            console.log('👋 Returning user login:', userEmail || 'unknown email');
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
