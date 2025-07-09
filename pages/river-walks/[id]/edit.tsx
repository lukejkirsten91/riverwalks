import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';
import { RiverWalkForm } from '../../../components/river-walks';
import { useOfflineRiverWalks } from '../../../hooks/useOfflineData';
import { useToast } from '../../../components/ui/ToastProvider';
import { getRiverWalkById } from '../../../lib/api/river-walks';
import type { RiverWalk, RiverWalkFormData } from '../../../types';
import type { User } from '@supabase/supabase-js';

export default function EditRiverWalkPage() {
  const router = useRouter();
  const { id } = router.query;
  const { showSuccess, showError } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [riverWalk, setRiverWalk] = useState<RiverWalk | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { updateRiverWalk } = useOfflineRiverWalks();

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

  const handleSubmit = async (formData: RiverWalkFormData) => {
    if (!riverWalk || !user) return;

    try {
      setSaving(true);
      
      await updateRiverWalk(riverWalk.id, formData);
      
      showSuccess('River Walk Updated', 'Your river walk has been updated successfully!');
      router.push('/river-walks');
    } catch (error) {
      console.error('Error updating river walk:', error);
      showError('Update Failed', error instanceof Error ? error.message : 'Failed to update river walk');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
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
            onClick={handleCancel}
            className="btn-primary"
          >
            Back to River Walks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="w-full sm:w-auto sm:max-w-4xl sm:rounded-lg overflow-hidden">
        <RiverWalkForm
          currentRiverWalk={riverWalk}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </div>
    </div>
  );
}