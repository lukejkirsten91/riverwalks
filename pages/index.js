import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function Home() {
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
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="container">
      <h1>Riverwalks</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : user ? (
        <div className="profile">
          <h2>Welcome, {user.email}</h2>
          {user.user_metadata?.avatar_url && (
            <img 
              src={user.user_metadata.avatar_url} 
              alt="User avatar" 
              style={{ width: '50px', height: '50px', borderRadius: '50%' }} 
            />
          )}
          <p>You are logged in with {user.app_metadata.provider}</p>
          <button className="button" onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <div>
          <p>Please sign in to continue</p>
          <button className="button" onClick={handleSignIn}>Sign In with Google</button>
        </div>
      )}
    </div>
  );
}