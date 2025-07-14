import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../ui/card';
import { LogIn, LogOut, MapPin, UserCheck, Mail } from 'lucide-react';
import { TermsGate } from './TermsGate';
import { EmailAuthForm } from './EmailAuthForm';
import { trackSignup, trackButtonClick, trackEvent } from '../../lib/analytics';

export default function AuthCard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showEmailAuth, setShowEmailAuth] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', { event, hasSession: !!session, user: session?.user?.email, provider: session?.user?.app_metadata?.provider });
        
        if (!isMounted) return;
        setUser(session?.user || null);
        setLoading(false);
        
        // Track authentication events
        if (event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata?.provider || 'unknown';
          console.log('User signed in with provider:', provider);
          trackSignup(provider === 'azure' ? 'microsoft' : provider);
          trackEvent('user_authenticated', {
            user_id: session.user.id,
            provider: provider,
            is_new_user: session.user.created_at === session.user.last_sign_in_at
          });
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          trackEvent('user_signed_out', {
            event_category: 'authentication'
          });
        }
      }
    );

    // Initial session check with error handling and retry for OAuth
    const checkInitialSession = async (retryCount: number = 0) => {
      try {
        console.log('Checking initial session...', retryCount);
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session check result:', { session: !!session, user: session?.user?.email, error, retryCount });
        
        if (!isMounted) return;
        
        if (error) {
          console.error('Session check error:', error);
          setUser(null);
          setLoading(false);
          return;
        }
        
        // If no session and this might be after OAuth redirect, retry
        if (!session && retryCount < 3) {
          console.log('No session found, retrying after delay...');
          setTimeout(() => {
            if (isMounted) checkInitialSession(retryCount + 1);
          }, 1000);
          return;
        }
        
        setUser(session?.user || null);
        setLoading(false);
      } catch (error) {
        console.error('Session check exception:', error);
        if (!isMounted) return;
        setUser(null);
        setLoading(false);
      }
    };

    checkInitialSession();

    // Simple timeout to prevent stuck loading
    const loadingTimeout = setTimeout(() => {
      if (!isMounted) return;
      setLoading(false);
    }, 5000); // 5 second timeout

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);


  const handleSignIn = async (provider: 'google' | 'azure') => {
    console.log('Attempting to sign in with provider:', provider);
    trackButtonClick(`continue_with_${provider}`, 'auth_card');
    
    const redirectUrl = 'https://www.riverwalks.co.uk/api/auth/callback';
    console.log('Using redirect URL:', redirectUrl);
    
    // Map azure to microsoft for Supabase (Supabase uses 'azure' not 'microsoft')
    const supabaseProvider = provider === 'azure' ? 'azure' : provider;
    console.log('Mapped provider for Supabase:', supabaseProvider);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: redirectUrl,
          queryParams: provider === 'google' ? {
            prompt: 'select_account', // Force Google to show account selection
            access_type: 'online'
          } : {
            prompt: 'select_account' // Force Microsoft to show account selection
          }
        },
      });
      
      if (error) {
        console.error('OAuth error:', error);
        alert(`Authentication error: ${error.message}`);
      } else {
        console.log('OAuth initiated successfully:', data);
      }
    } catch (err) {
      console.error('OAuth exception:', err);
      alert(`Authentication failed: ${err}`);
    }
  };

  const handleSignOut = async () => {
    trackButtonClick('sign_out', 'auth_card');
    
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSwitchAccount = async () => {
    trackButtonClick('switch_account', 'auth_card');
    
    // Sign out current user
    await supabase.auth.signOut();
    // Force account selection on next sign in
    setTimeout(() => {
      const redirectUrl = 'https://www.riverwalks.co.uk/api/auth/callback';
      
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account',
            access_type: 'online'
          }
        }
      });
    }, 500); // Small delay to ensure sign out completes
  };

  if (loading) {
    return (
      <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
        <CardHeader className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4 animate-pulse">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl text-foreground">Loading...</CardTitle>
          <CardDescription className="text-muted-foreground">
            Preparing your river study workspace
          </CardDescription>
        </CardHeader>
      </div>
    );
  }

  if (user) {
    return (
      <TermsGate user={user}>
        <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="User avatar"
                  className="w-16 h-16 rounded-full shadow-modern border-4 border-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-white text-xl font-bold shadow-modern">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <CardDescription className="text-muted-foreground text-sm">
              {user.email}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-3 pt-2">
            <button
              onClick={() => {
                trackButtonClick('view_river_walks', 'auth_card');
                router.push('/river-walks');
              }}
              className="btn-primary w-full touch-manipulation"
            >
              <MapPin className="mr-2 h-5 w-5" /> 
              View River Walks
            </button>
            <button 
              onClick={handleSwitchAccount} 
              className="btn-secondary w-full touch-manipulation"
            >
              <UserCheck className="mr-2 h-4 w-4" /> 
              Switch Account
            </button>
            <button 
              onClick={handleSignOut} 
              className="btn-secondary w-full touch-manipulation"
            >
              <LogOut className="mr-2 h-4 w-4" /> 
              Sign Out
            </button>
          </CardFooter>
        </div>
      </TermsGate>
    );
  }

  if (showEmailAuth) {
    return (
      <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl text-foreground mb-2">
            Get Started Now
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmailAuthForm onBack={() => setShowEmailAuth(false)} />
        </CardContent>
      </div>
    );
  }

  return (
    <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl text-foreground mb-2">
          Get Started Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <button 
          onClick={() => handleSignIn('google')} 
          className="btn-primary w-full touch-manipulation text-base text-white"
        >
          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <button 
          onClick={() => handleSignIn('azure')} 
          className="btn-secondary w-full touch-manipulation text-base"
        >
          <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#00A4EF"
              d="M0 0h12v12H0z"
            />
            <path
              fill="#FFB900"
              d="M12 0h12v12H12z"
            />
            <path
              fill="#00BCF2"
              d="M0 12h12v12H0z"
            />
            <path
              fill="#40E0D0"
              d="M12 12h12v12H12z"
            />
          </svg>
          Continue with Microsoft
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-muted-foreground border border-gray-100">Or</span>
          </div>
        </div>

        <button 
          onClick={() => {
            trackButtonClick('continue_with_email', 'auth_card');
            setShowEmailAuth(true);
          }}
          className="btn-secondary w-full touch-manipulation text-base"
        >
          <Mail className="mr-3 h-5 w-5" />
          Continue with Email
        </button>
        
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            New to Riverwalks? Any option will create your free account.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium">
              ✨ Save your river studies and access them from any device
            </p>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link 
              href="/terms" 
              target="_blank"
              className="text-primary hover:text-primary/80 underline"
            >
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link 
              href="/privacy" 
              target="_blank"
              className="text-primary hover:text-primary/80 underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </CardContent>
    </div>
  );
}
