import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';
import { ReportGenerator } from '../../../components/river-walks/ReportGenerator';
import { getRiverWalkById } from '../../../lib/api/river-walks';
import { getSitesForRiverWalk } from '../../../lib/api/sites';
import { resetModalStyles } from '../../../lib/utils/modal';
import type { RiverWalk, Site } from '../../../types';
import type { User } from '@supabase/supabase-js';

export default function ReportPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [riverWalk, setRiverWalk] = useState<RiverWalk | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
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

    const fetchData = async () => {
      try {
        setLoading(true);
        const [walk, walkSites] = await Promise.all([
          getRiverWalkById(id),
          getSitesForRiverWalk(id)
        ]);
        
        setRiverWalk(walk);
        setSites(walkSites);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load river walk data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleClose = () => {
    router.push('/river-walks');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading river walk data...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 sm:p-4">
      <div className="max-w-6xl mx-auto">
        <ReportGenerator
          riverWalk={riverWalk}
          sites={sites}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}