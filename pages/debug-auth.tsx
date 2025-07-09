import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function DebugAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<string>('Checking your sign-in status...');
  const [sessionData, setSessionData] = useState<any>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      setAuthState('Checking your sign-in status...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthState(`There's a problem with your sign-in: ${error.message}`);
        setSessionData({ error: error.message });
      } else {
        setUser(session?.user || null);
        setSessionData(session);
        setAuthState(session?.user ? 'You are signed in' : 'You are not signed in');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAuthState(`Something went wrong: ${errorMessage}`);
      setSessionData({ exception: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const clearAuthState = async () => {
    try {
      setClearing(true);
      
      // Sign out from Riverwalks
      await supabase.auth.signOut();
      
      // Clear all saved data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear offline data if it exists
      if (typeof window !== 'undefined' && window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.warn('Could not clear offline data:', e);
        }
      }
      
      // Take you back to the home page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing sign-in data:', error);
    } finally {
      setClearing(false);
    }
  };

  const refreshAuth = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Fix Sign-In Issues</h1>
        
        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Your Sign-In Status</h3>
            <p className="text-blue-800">
              {loading ? 'Checking...' : authState}
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Your Account</h3>
            {user ? (
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Account created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                <p><strong>Last signed in:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Not available'}</p>
              </div>
            ) : (
              <p className="text-gray-600">No account information found</p>
            )}
          </div>

          {/* Session Data - Only show if there's technical info */}
          {sessionData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Technical Details</h3>
              <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                {JSON.stringify(sessionData, null, 2)}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshAuth}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Refresh Status
            </button>
            
            <button
              onClick={clearAuthState}
              disabled={clearing || loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All Data & Sign Out'}
            </button>
            
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Back to Home
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">Stuck on a loading screen?</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p><strong>1.</strong> Try "Refresh Status" first - this usually fixes most issues</p>
              <p><strong>2.</strong> If still stuck, use "Clear All Data & Sign Out" - this will completely reset your sign-in</p>
              <p><strong>3.</strong> After clearing, you'll go back to the home page where you can sign in fresh</p>
              <p><strong>Note:</strong> This won't delete your river walks - they're safely stored in your account</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}