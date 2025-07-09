import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { RiverWalkForm } from '../../components/river-walks';
import { useOfflineRiverWalks } from '../../hooks/useOfflineData';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useToast } from '../../components/ui/ToastProvider';
import type { RiverWalkFormData } from '../../types';
import type { User } from '@supabase/supabase-js';

export default function NewRiverWalkPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { markFirstRiverWalkCreated } = useOnboarding();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const { createRiverWalk } = useOfflineRiverWalks();

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

  const handleSubmit = async (formData: RiverWalkFormData) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const newRiverWalk = await createRiverWalk({
        ...formData,
        user_id: user.id,
      });

      if (newRiverWalk) {
        showSuccess('River Walk Created', 'Your new river walk has been created successfully!');
        markFirstRiverWalkCreated();
        router.push('/river-walks');
      }
    } catch (error) {
      console.error('Error creating river walk:', error);
      showError('Creation Failed', error instanceof Error ? error.message : 'Failed to create river walk');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/river-walks');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-stretch sm:items-center justify-center sm:p-4">
      <div className="w-full sm:w-auto sm:max-w-4xl sm:rounded-lg overflow-hidden">
        <RiverWalkForm
          currentRiverWalk={null}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
        />
      </div>
    </div>
  );
}