import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';
import { ShareModal } from '../../../components/river-walks/ShareModal';
import { getRiverWalkById } from '../../../lib/api/river-walks';
import { resetModalStyles } from '../../../lib/utils/modal';
import type { RiverWalk } from '../../../types';
import type { User } from '@supabase/supabase-js';

export default function SharePage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [riverWalk, setRiverWalk] = useState<RiverWalk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset any modal styles that might be blocking interactions
  useEffect(() => {
    resetModalStyles();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchRiverWalk = async () => {
      try {
        setLoading(true);
        const walk = await getRiverWalkById(id);
        setRiverWalk(walk);
      } catch (err) {
        console.error('Error fetching river walk:', err);
        setError('Failed to load river walk');
      } finally {
        setLoading(false);
      }
    };

    fetchRiverWalk();
  }, [id]);

  const handleClose = () => {
    router.push('/river-walks');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading river walk...</p>
        </div>
      </div>
    );
  }

  if (error || !riverWalk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error || 'River walk not found'}</p>
          <button
            onClick={handleClose}
            className="btn-primary"
          >
            Back to River Walks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-xl">
          <ShareModal
            riverWalk={riverWalk}
            isOpen={true}
            onClose={handleClose}
          />
        </div>
      </div>
    </div>
  );
}