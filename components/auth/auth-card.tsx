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
  const [loadingIssueDetected, setLoadingIssueDetected] = useState<boolean>(false);
  const [autoFixing, setAutoFixing] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    // Initial session check with error handling
    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        if (error) {
          console.error('Session check error:', error);
          setUser(null);
          setLoading(false);
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

    // Progressive timeout system - detect issues and auto-fix
    const warningTimeout = setTimeout(() => {
      if (!isMounted || !loading) return;
      console.warn('Auth loading is taking longer than expected - detecting issue');
      setLoadingIssueDetected(true);
    }, 3000); // 3 second warning

    const autoFixTimeout = setTimeout(() => {
      if (!isMounted || !loading) return;
      console.warn('Auth loading issue confirmed - starting auto-fix');
      setAutoFixing(true);
      attemptAutoFix();
    }, 6000); // 6 second auto-fix

    const finalTimeout = setTimeout(() => {
      if (!isMounted) return;
      console.warn('Auth loading timeout - forcing loading to false');
      setLoading(false);
      setLoadingIssueDetected(false);
      setAutoFixing(false);
    }, 10000); // 10 second final timeout

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
      clearTimeout(warningTimeout);
      clearTimeout(autoFixTimeout);
      clearTimeout(finalTimeout);
    };
  }, [retryCount]);

  const attemptAutoFix = async () => {
    if (retryCount >= 2) {
      console.log('Max retry attempts reached - offering manual fix');
      setAutoFixing(false);
      return;
    }

    try {
      console.log(`Auto-fix attempt ${retryCount + 1}: Clearing auth state and retrying`);
      
      // Clear potentially stuck auth state
      await supabase.auth.signOut();
      
      // Clear local storage that might be causing issues
      localStorage.removeItem('supabase.auth.token');
      
      // Wait a moment then try again
      setTimeout(async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (!error && session) {
            setUser(session.user);
            setLoading(false);
            setLoadingIssueDetected(false);
            setAutoFixing(false);
            console.log('Auto-fix successful!');
          } else {
            setRetryCount(prev => prev + 1);
            if (retryCount < 1) {
              attemptAutoFix();
            } else {
              setAutoFixing(false);
            }
          }
        } catch (error) {
          console.error('Auto-fix failed:', error);
          setRetryCount(prev => prev + 1);
          if (retryCount < 1) {
            attemptAutoFix();
          } else {
            setAutoFixing(false);
          }
        }
      }, 1000);
      
    } catch (error) {
      console.error('Auto-fix error:', error);
      setAutoFixing(false);
    }
  };

  const manualFix = async () => {
    try {
      // Clear all auth data
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Manual fix error:', error);
      window.location.reload();
    }
  };

  const handleSignIn = async () => {
    const redirectUrl = 'https://www.riverwalks.co.uk/api/auth/callback';
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
          
          {autoFixing ? (
            <>
              <CardTitle className="text-xl text-foreground">Fixing Loading Issue...</CardTitle>
              <CardDescription className="text-muted-foreground mb-4">
                We detected a loading problem and are fixing it automatically
              </CardDescription>
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Auto-fixing in progress...</span>
              </div>
            </>
          ) : loadingIssueDetected ? (
            <>
              <CardTitle className="text-xl text-foreground">Loading Issue Detected</CardTitle>
              <CardDescription className="text-muted-foreground mb-4">
                Sign-in is taking longer than usual. Auto-fix starting soon...
              </CardDescription>
              <div className="flex items-center justify-center space-x-2 text-sm text-amber-600">
                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Preparing to resolve issue...</span>
              </div>
            </>
          ) : (
            <>
              <CardTitle className="text-xl text-foreground">Loading...</CardTitle>
              <CardDescription className="text-muted-foreground">
                Preparing your river study workspace
              </CardDescription>
            </>
          )}
          
          {/* Manual fix option after auto-fix attempts */}
          {loadingIssueDetected && !autoFixing && retryCount >= 2 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                Having trouble? We can fix this for you.
              </p>
              <button
                onClick={manualFix}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Fix Sign-In Issue
              </button>
            </div>
          )}
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
      </TermsGate>
    );
  }

  return (
    <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl text-foreground mb-2">
          Get Started Now
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
          <CardDescription className="text-muted-foreground mb-4">
            Join Riverwalks to start your river documentation journey
          </CardDescription>
          
          <p className="text-xs text-muted-foreground mb-2">
            New to Riverwalks? This will create your free account.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
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
