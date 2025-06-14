import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { LogIn, LogOut, MapPin } from 'lucide-react';

export default function AuthCard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Welcome, {user.email}</CardTitle>
          <CardDescription>You are logged in with {user.app_metadata?.provider || 'email'}</CardDescription>
        </CardHeader>
        <CardContent>
          {user.user_metadata?.avatar_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={user.user_metadata.avatar_url} 
                alt="User avatar" 
                className="w-16 h-16 rounded-full" 
              />
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button onClick={() => router.push('/river-walks')} className="w-full">
            <MapPin className="mr-2 h-4 w-4" /> View River Walks
          </Button>
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>Sign in to access Riverwalks</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button onClick={handleSignIn} className="w-full">
          <LogIn className="mr-2 h-4 w-4" /> Sign In with Google
        </Button>
      </CardContent>
    </Card>
  );
}