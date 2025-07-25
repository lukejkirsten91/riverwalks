import { createClient } from '@supabase/supabase-js';
import { getPWASupabaseConfig } from './pwaUtils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with PWA-optimized configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...getPWASupabaseConfig(),
  global: {
    headers: {
      'x-application-name': 'riverwalks-pwa',
    },
  },
});
