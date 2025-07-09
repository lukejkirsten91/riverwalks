import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { UpgradePrompt } from '../components/ui/UpgradePrompt';
import type { User } from '@supabase/supabase-js';

export default function UpgradePage() {
  const router = useRouter();
  const { feature } = router.query;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleClose = () => {
    router.push('/river-walks');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Validate feature parameter
  const validFeatures = ['reports', 'export', 'advanced'] as const;
  const featureType = validFeatures.includes(feature as any) ? feature as typeof validFeatures[number] : 'advanced';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <UpgradePrompt
        feature={featureType}
        onClose={handleClose}
      />
    </div>
  );
}