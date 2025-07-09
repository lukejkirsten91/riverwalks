import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function DebugAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<string>('checking');
  const [sessionData, setSessionData] = useState<any>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      setAuthState('checking session...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setAuthState(`Session error: ${error.message}`);
        setSessionData({ error: error.message });
      } else {
        setUser(session?.user || null);
        setSessionData(session);
        setAuthState(session?.user ? 'authenticated' : 'not authenticated');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAuthState(`Exception: ${errorMessage}`);
      setSessionData({ exception: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const clearAuthState = async () => {
    try {
      setClearing(true);
      
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear IndexedDB if it exists
      if (typeof window !== 'undefined' && window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.warn('Could not clear IndexedDB:', e);
        }
      }
      
      // Wait a moment then reload
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing auth state:', error);
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
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Authentication Debug</h1>
        
        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Current Status</h3>
            <p className="text-blue-800">
              {loading ? 'Loading...' : authState}
            </p>
          </div>

          {/* User Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">User Information</h3>
            {user ? (
              <div className="space-y-2 text-sm">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
                <p><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
              </div>
            ) : (
              <p className="text-gray-600">No user found</p>
            )}
          </div>

          {/* Session Data */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Session Data</h3>
            <pre className="text-xs text-gray-600 overflow-auto max-h-40">
              {JSON.stringify(sessionData, null, 2)}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={refreshAuth}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Refresh Auth State
            </button>
            
            <button
              onClick={clearAuthState}
              disabled={clearing || loading}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All Auth Data'}
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
            <h3 className="font-semibold text-yellow-900 mb-2">Having Issues?</h3>
            <div className="text-sm text-yellow-800 space-y-1">
              <p>1. Try refreshing the auth state first</p>
              <p>2. If still stuck, use "Clear All Auth Data" - this will sign you out and clear all stored data</p>
              <p>3. After clearing, you'll be redirected to the home page where you can sign in again</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}