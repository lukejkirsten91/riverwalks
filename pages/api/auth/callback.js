import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  console.log('Auth callback received:', req.query);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { code } = req.query;

  if (code) {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Error exchanging code for session:', error);
      } else {
        console.log('Session established successfully');
      }
    } catch (error) {
      console.error('Exception during code exchange:', error);
    }
  }

  // Redirect to the home page of the current domain
  res.redirect('/');
}