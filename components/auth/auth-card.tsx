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
import { LogIn, LogOut, MapPin, UserCheck } from 'lucide-react';
import { TermsGate } from './TermsGate';

export default function AuthCard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Fallback timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - forcing loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => {
      authListener?.subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [loading]);

  const handleSignIn = async () => {
    const { protocol, host } = window.location;
    const redirectUrl = `${protocol}//${host}/api/auth/callback`;
    console.log('Redirecting to:', redirectUrl);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account', // Force Google to show account selection
          access_type: 'online'
        }
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSwitchAccount = async () => {
    // Sign out current user
    await supabase.auth.signOut();
    // Force account selection on next sign in
    setTimeout(() => {
      const { protocol, host } = window.location;
      const redirectUrl = `${protocol}//${host}/api/auth/callback`;
      
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
      // <TermsGate user={user}>
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
              onClick={() => router.push('/river-walks')}
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
      // </TermsGate>
    );
  }

  return (
    <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl text-foreground mb-2">
          Create Your Free Account
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Join Riverwalks to start your river documentation journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-primary mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">
            Professional river analysis tools for students and educators
          </p>
        </div>
        
        <button 
          onClick={handleSignIn} 
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
          Sign In / Create Account
        </button>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-2">
            New to Riverwalks? This will create your free account.
          </p>
          <p className="text-xs text-muted-foreground">
            Already have an account? You'll be signed in automatically.
          </p>
        </div>
        
        <div className="text-center space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800 font-medium">
              ✨ Creating an account allows you to save your river studies and access them from any device
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
