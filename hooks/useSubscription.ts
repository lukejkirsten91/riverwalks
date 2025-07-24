import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  hasLifetimeAccess: boolean;
  subscriptionType: 'free' | 'annual' | 'lifetime';
  loading: boolean;
}

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>(() => {
    // Try to initialize with cached subscription data to prevent brief "basic user" flash
    if (typeof window !== 'undefined') {
      try {
        // Try to get cached subscription from localStorage
        const lastKnownSubscription = localStorage.getItem('riverwalks_last_known_subscription');
        if (lastKnownSubscription) {
          const cached = JSON.parse(lastKnownSubscription);
          const cacheAge = Date.now() - (cached.cachedAt || 0);
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (cacheAge <= maxAge) {
            console.log('🚀 Initializing useSubscription with cached data:', cached);
            return {
              isSubscribed: cached.isSubscribed || false,
              hasLifetimeAccess: cached.hasLifetimeAccess || false,
              subscriptionType: cached.subscriptionType || 'free',
              loading: true, // Still loading to verify/update
            };
          }
        }
      } catch (error) {
        console.warn('Failed to initialize with cached subscription:', error);
      }
    }
    
    // Default fallback
    return {
      isSubscribed: false,
      hasLifetimeAccess: false,
      subscriptionType: 'free',
      loading: true,
    };
  });
  const [isOnlineState, setIsOnlineState] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [hasInitialized, setHasInitialized] = useState(false);

  // Helper to get cached subscription status
  const getCachedSubscription = (userId: string): SubscriptionStatus | null => {
    if (typeof window === 'undefined') return null;
    
    // First try user-specific cache
    try {
      const cached = localStorage.getItem(`riverwalks_subscription_${userId}`);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is less than 7 days old (longer for offline scenarios)
        const cacheAge = Date.now() - (parsedCache.cachedAt || 0);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        if (cacheAge <= maxAge) {
          console.log('✅ Found valid user-specific cached subscription:', parsedCache);
          return parsedCache;
        } else {
          console.log('🗑️ User-specific cached subscription expired, removing');
          localStorage.removeItem(`riverwalks_subscription_${userId}`);
        }
      }
    } catch (error) {
      console.warn('Failed to parse user-specific cached subscription:', error);
      localStorage.removeItem(`riverwalks_subscription_${userId}`);
    }
    
    // Fallback to backup cache if user-specific cache failed
    try {
      const backupCached = localStorage.getItem('riverwalks_last_known_subscription');
      if (backupCached) {
        const parsedBackup = JSON.parse(backupCached);
        // Verify it's for the same user and not too old
        if (parsedBackup.userId === userId) {
          const cacheAge = Date.now() - (parsedBackup.cachedAt || 0);
          const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
          
          if (cacheAge <= maxAge) {
            console.log('✅ Using backup cached subscription:', parsedBackup);
            return parsedBackup;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse backup cached subscription:', error);
    }
    
    return null;
  };

  // Helper to cache subscription status
  const cacheSubscription = (userId: string, subscription: SubscriptionStatus) => {
    if (typeof window === 'undefined') return;
    try {
      const cacheData = {
        ...subscription,
        cachedAt: Date.now(),
        userId: userId // Store user ID for validation
      };
      localStorage.setItem(`riverwalks_subscription_${userId}`, JSON.stringify(cacheData));
      // Also store as a backup with a generic key
      localStorage.setItem('riverwalks_last_known_subscription', JSON.stringify(cacheData));
      console.log('✅ Cached subscription status:', cacheData);
    } catch (error) {
      console.warn('Failed to cache subscription status:', error);
    }
  };

  // Monitor online/offline state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('🟢 Subscription hook: Back online');
      setIsOnlineState(true);
    };

    const handleOffline = () => {
      console.log('🔴 Subscription hook: Gone offline');
      setIsOnlineState(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state check
    setIsOnlineState(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // React to online/offline state changes and initial mount
  useEffect(() => {
    const checkSubscription = async () => {
      // Prevent redundant checks if we just initialized with good cached data
      if (!hasInitialized && status.isSubscribed && !status.loading) {
        console.log('⏭️ Skipping initial check - already have good cached data');
        setHasInitialized(true);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log('👤 No authenticated user found');
          setStatus({
            isSubscribed: false,
            hasLifetimeAccess: false,
            subscriptionType: 'free',
            loading: false,
          });
          setHasInitialized(true);
          return;
        }

        // If offline, try to use cached subscription data
        if (!isOnlineState) {
          console.log('🔌 Offline - checking for cached subscription data for user:', user.id);
          const cachedStatus = getCachedSubscription(user.id);
          if (cachedStatus) {
            console.log('✅ Using cached subscription status:', cachedStatus);
            setStatus({
              ...cachedStatus,
              loading: false
            });
            setHasInitialized(true);
            return;
          } else {
            console.log('⚠️ No cached subscription data available, preserving current status to avoid reset');
            // Don't reset to free when offline - preserve current status to avoid losing premium access
            setStatus(prevStatus => {
              console.log('📋 Preserving current status:', prevStatus);
              return {
                ...prevStatus,
                loading: false
              };
            });
            setHasInitialized(true);
            return;
          }
        }

        // When coming back online, check cache first to avoid unnecessary API calls
        console.log('🟢 Online - checking subscription for user:', user.id);
        
        // First check if we have valid cached data to avoid API calls
        const cachedStatus = getCachedSubscription(user.id);
        if (cachedStatus && cachedStatus.isSubscribed) {
          console.log('✅ Found valid cached premium subscription, using it:', cachedStatus);
          setStatus({
            ...cachedStatus,
            loading: false
          });
          // Still cache it again to refresh the timestamp
          cacheSubscription(user.id, cachedStatus);
          setHasInitialized(true);
          return;
        }

        // Check if user has a subscription record
        console.log('🔍 Checking subscription for authenticated user via API');
        
        // Try to get subscription using the database function to bypass RLS
        let subscription = null;
        let error = null;
        
        try {
          console.log('🔍 Trying database function approach');
          const functionResult = await supabase.rpc('get_user_subscription', { 
            user_uuid: user.id 
          });
          
          if (functionResult.error) {
            console.error('❌ Database function failed:', functionResult.error);
            throw functionResult.error;
          }
          
          subscription = functionResult.data?.[0] || null;
          console.log('✅ Database function success:', subscription);
        } catch (rpcError) {
          console.error('❌ Database function not available, trying direct query:', rpcError);
          
          // Fallback: Direct query
          try {
            const fallbackResult = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .limit(1);
            
            subscription = fallbackResult.data?.[0] || null;
            error = fallbackResult.error;
            console.log('📋 Direct query result:', { subscription, error });
          } catch (fallbackError) {
            console.error('❌ All subscription queries failed:', fallbackError);
            error = fallbackError;
          }
        }

        console.log('📊 Subscription query result:', { subscription, error });

        if (error && typeof error === 'object' && 'code' in error && (error as any).code !== 'PGRST116') {
          console.error('❌ Error checking subscription:', error);
        }

        const isSubscribed = !!subscription;
        const hasLifetimeAccess = subscription?.subscription_type === 'lifetime';
        const subscriptionType = subscription?.subscription_type || 'free';

        console.log('✅ Final subscription status:', {
          isSubscribed,
          hasLifetimeAccess,
          subscriptionType
        });

        const finalStatus = {
          isSubscribed,
          hasLifetimeAccess,
          subscriptionType: subscriptionType as 'free' | 'annual' | 'lifetime',
          loading: false,
        };

        // Cache the subscription status for offline use
        cacheSubscription(user.id, finalStatus);

        setStatus(finalStatus);
        setHasInitialized(true);
      } catch (error) {
        console.error('Error checking subscription status:', error);
        
        // Try to use cached data if available, otherwise preserve current status
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const cachedStatus = getCachedSubscription(user.id);
          if (cachedStatus) {
            console.log('⚠️ Using cached subscription status due to error:', cachedStatus);
            setStatus({
              ...cachedStatus,
              loading: false
            });
            return;
          }
        }
        
        // No cached data available - preserve current status instead of defaulting to free
        console.log('⚠️ No cached data available, preserving current subscription status');
        setStatus(prevStatus => ({
          ...prevStatus,
          loading: false
        }));
        setHasInitialized(true);
      }
    };

    checkSubscription();
  }, [isOnlineState]);

  return status;
}

// Helper functions for feature access
export function canAccessReports(subscription: SubscriptionStatus): boolean {
  return subscription.isSubscribed;
}

export function canExportData(subscription: SubscriptionStatus): boolean {
  return true; // Excel export is now free for all users
}

export function canAccessAdvancedFeatures(subscription: SubscriptionStatus): boolean {
  return subscription.isSubscribed;
}

// Helper function to clear cached subscription data (call on sign out)
export function clearCachedSubscription(userId?: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (userId) {
      localStorage.removeItem(`riverwalks_subscription_${userId}`);
    } else {
      // Clear all subscription caches if no specific user ID
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('riverwalks_subscription_')) {
          localStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.warn('Failed to clear cached subscription data:', error);
  }
}