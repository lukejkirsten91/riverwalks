import AuthCard from '../components/auth/auth-card';
import { PWAInstallButton } from '../components/pwa/PWAInstallButton';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { shouldRedirectAuthenticatedUser } from '../lib/pwaUtils';
import type { User } from '@supabase/supabase-js';

export default function Signup() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        const newUser = session?.user || null;
        setUser(newUser);
        
        // Redirect authenticated users
        if (newUser && shouldRedirectAuthenticatedUser(newUser)) {
          router.push('/river-walks');
          return;
        }
        
        setIsCheckingAuth(false);
      }
    );

    // Initial session check
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (error) {
          console.error('Signup page session check error:', error);
          setUser(null);
          setIsCheckingAuth(false);
          return;
        }
        
        const sessionUser = session?.user || null;
        setUser(sessionUser);
        
        if (sessionUser && shouldRedirectAuthenticatedUser(sessionUser)) {
          router.push('/river-walks');
          return;
        }
        
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Signup page session check exception:', error);
        if (!isMounted) return;
        setUser(null);
        setIsCheckingAuth(false);
      }
    };

    checkInitialSession();

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  if (isCheckingAuth) {
    return (
      <div className="gradient-hero flex items-center justify-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <div className="flex items-center gap-2 text-white">
            <img src="/logo.png" alt="Riverwalks" className="h-8 w-8" />
            <span className="text-xl font-semibold">Riverwalks</span>
          </div>
          <p className="text-white/80 text-sm mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-hero" style={{ minHeight: '100vh' }}>
      {/* Top Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
          >
            <img src="/logo.png" alt="Riverwalks" className="h-8 w-8" />
            <span className="font-semibold text-lg">Riverwalks</span>
          </button>
          
          <div className="flex items-center gap-3">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen py-16 p-4 sm:p-6 lg:p-8">
        <div className="text-center max-w-2xl mx-auto">
          {/* Hero Message */}
          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Start Your <span className="text-cyan-200">River Study</span> Journey
            </h1>
            <p className="text-white/80 text-lg mb-6">
              Join thousands of students creating <span className="text-blue-100 font-semibold">professional GCSE reports</span>{' '}
              without the hours of work.
            </p>
          </div>

          {/* Auth Card */}
          <div className="w-full max-w-md mx-auto mb-8">
            <AuthCard />
          </div>

          {/* Back to Home */}
          <button
            onClick={() => router.push('/')}
            className="text-white/70 hover:text-white text-sm transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}