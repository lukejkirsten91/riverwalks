import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { sendWelcomeEmail } from '../../../lib/email';
import { logger } from '../../../lib/logger';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  logger.info('OAuth callback received', { method: req.method });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error('Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { code } = req.query;
  const codeString = Array.isArray(code) ? code[0] : code;
  logger.info('OAuth code received for exchange');

  if (codeString) {
    try {
      logger.info('Exchanging OAuth code for session');
      const { data, error } =
        await supabase.auth.exchangeCodeForSession(codeString);
      if (error) {
        logger.error('Error exchanging OAuth code for session', { message: error.message, status: error.status });
      } else {
        logger.info('OAuth session exchange successful');
        // Check if this is a new user and send welcome email
        if (data?.user && data?.session) {
          const user = data.user;
          const userEmail = user.email;
          
          // Check if user was created recently (within last 10 minutes to account for OAuth delays)
          const userCreatedAt = new Date(user.created_at);
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          const isNewUser = userCreatedAt > tenMinutesAgo;
          
          if (isNewUser && userEmail) {
            // Send welcome email using template system asynchronously (don't block the redirect)
            const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail.split('@')[0];
            
            // Call our new template-based welcome email API
            fetch(`${process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://riverwalks.co.uk'}/api/admin/send-welcome-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: user.id,
                userEmail: userEmail,
                userName: userName,
                manual: false // This is automatic, not manual admin send
              })
            }).catch((emailError) => {
              logger.error('Welcome email error', { 
                error: emailError instanceof Error ? emailError.message : 'Unknown error',
                userId: user.id,
                userEmail 
              });
            });
          }
        }
      }
    } catch (error) {
      logger.error('Exception during OAuth code exchange', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // Check for redirect_to parameter, default to river-walks
  const redirectTo = typeof req.query.redirect_to === 'string' ? req.query.redirect_to : '/river-walks';
  
  logger.info('OAuth completed, redirecting user');
  res.redirect(redirectTo);
}
