import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
import { LogIn, LogOut, MapPin } from 'lucide-react';

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

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    const { protocol, host } = window.location;
    const redirectUrl = `${protocol}//${host}/api/auth/callback`;
    console.log('Redirecting to:', redirectUrl);

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
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
      <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="User avatar"
                className="w-20 h-20 rounded-full shadow-modern border-4 border-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shadow-modern">
                {user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <CardTitle className="text-2xl text-foreground">
            Welcome back!
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Signed in as {user.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Ready to continue your river studies?
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 pt-6">
          <button
            onClick={() => router.push('/river-walks')}
            className="btn-primary w-full touch-manipulation"
          >
            <MapPin className="mr-2 h-5 w-5" /> 
            View River Walks
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
    );
  }

  return (
    <div className="card-modern-xl backdrop-blur-sm bg-white/95 w-full">
      <CardHeader className="text-center pb-6">
        <CardTitle className="text-2xl text-foreground mb-2">
          Welcome to Riverwalks
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Sign in to start documenting your river studies
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
          className="btn-primary w-full touch-manipulation text-base"
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
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            By signing in, you agree to our terms of service
          </p>
        </div>
      </CardContent>
    </div>
  );
}
