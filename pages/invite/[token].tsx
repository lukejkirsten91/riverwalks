import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Users, ArrowRight, AlertCircle } from 'lucide-react';
import { useCollaboration } from '../../hooks/useCollaboration';
import { getInviteDetails } from '../../lib/api/collaboration';
import { supabase } from '../../lib/supabase';

export default function AcceptInvitePage() {
  const router = useRouter();
  const { token } = router.query;
  const { acceptInvite, collaborationEnabled } = useCollaboration();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required' | 'email-mismatch'>('loading');
  const [message, setMessage] = useState('');
  const [riverWalkId, setRiverWalkId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    // Check authentication status and invite details
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        setStatus('auth-required');
        return;
      }
      
      setUserEmail(user.email || '');
      
      // Check invite details first
      if (token && typeof token === 'string') {
        try {
          const inviteDetails = await getInviteDetails(token);
          
          if (!inviteDetails.valid) {
            setStatus('error');
            setMessage('This invite link is invalid or has expired');
            return;
          }
          
          setInviteEmail(inviteDetails.user_email);
          
          // Check for email mismatch (only for specific email invites)
          if (inviteDetails.user_email !== '*' && inviteDetails.user_email !== user.email) {
            setStatus('email-mismatch');
            setMessage(`This invite was sent to ${inviteDetails.user_email}, but you're signed in as ${user.email}`);
            return;
          }
          
          // Email matches or universal invite, proceed with acceptance
          await handleAcceptInvite(token);
        } catch (error) {
          setStatus('error');
          setMessage('Failed to check invite details');
        }
      }
    };

    checkAuth();
  }, [token]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && token && typeof token === 'string') {
        setUser(session.user);
        setUserEmail(session.user.email || '');
        
        // Check invite details again on new sign in
        try {
          const inviteDetails = await getInviteDetails(token);
          
          if (!inviteDetails.valid) {
            setStatus('error');
            setMessage('This invite link is invalid or has expired');
            return;
          }
          
          setInviteEmail(inviteDetails.user_email);
          
          // Check for email mismatch again
          if (inviteDetails.user_email !== '*' && inviteDetails.user_email !== session.user.email) {
            setStatus('email-mismatch');
            setMessage(`This invite was sent to ${inviteDetails.user_email}, but you're signed in as ${session.user.email}`);
            return;
          }
          
          // Email matches, proceed with acceptance
          await handleAcceptInvite(token);
        } catch (error) {
          setStatus('error');
          setMessage('Failed to check invite details');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [token]);

  const handleAcceptInvite = async (inviteToken: string) => {
    if (!collaborationEnabled) {
      setStatus('error');
      setMessage('Collaboration features are not enabled');
      return;
    }

    try {
      setStatus('loading');
      const result = await acceptInvite(inviteToken);
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        setRiverWalkId(result.river_walk_id);
        
        // Redirect to river walks after a delay
        setTimeout(() => {
          router.push('/river-walks');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleSignIn = () => {
    const redirectUrl = `${window.location.origin}/invite/${token}`;
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          prompt: 'select_account', // Force Google to show account selection
          access_type: 'online'
        }
      }
    });
  };

  if (!collaborationEnabled) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-modern-lg p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Feature Not Available</h1>
          <p className="text-muted-foreground mb-6">
            Collaboration features are currently disabled.
          </p>
          <Link href="/" className="btn-primary">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-modern-lg p-8 max-w-md w-full">
        {status === 'loading' && (
          <div className="text-center">
            <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Processing Invitation</h1>
            <p className="text-muted-foreground">
              Please wait while we process your collaboration invite...
            </p>
          </div>
        )}

        {status === 'auth-required' && (
          <div className="text-center">
            <Users className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              You need to sign in to accept this collaboration invite.
            </p>
            <button onClick={handleSignIn} className="btn-primary w-full mb-4">
              Sign In with Google
            </button>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Return to Home
            </Link>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to the Team!</h1>
            <p className="text-muted-foreground mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/river-walks" className="btn-primary w-full flex items-center justify-center">
                View River Walks
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <p className="text-xs text-muted-foreground">
                Redirecting automatically in 3 seconds...
              </p>
            </div>
          </div>
        )}

        {status === 'email-mismatch' && (
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Mismatch</h1>
            <p className="text-muted-foreground mb-2">{message}</p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-sm text-left">
              <p className="mb-2"><strong>Invite sent to:</strong> {inviteEmail}</p>
              <p><strong>You're signed in as:</strong> {userEmail}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  // Force account selection on next sign in
                  const redirectUrl = `${window.location.origin}/invite/${token}`;
                  setTimeout(() => {
                    supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: redirectUrl,
                        queryParams: {
                          prompt: 'select_account',
                          login_hint: inviteEmail, // Suggest the correct email
                          access_type: 'online'
                        }
                      }
                    });
                  }, 500); // Small delay to ensure sign out completes
                }} 
                className="btn-primary w-full"
              >
                Sign Out & Sign In with {inviteEmail}
              </button>
              <Link href="/river-walks" className="btn-secondary w-full">
                Continue with Current Account
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              You need to sign in with the email address that received this invite to accept it.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Invitation Error</h1>
            <p className="text-red-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link href="/river-walks" className="btn-primary w-full">
                Go to River Walks
              </Link>
              <Link href="/" className="btn-secondary w-full">
                Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}