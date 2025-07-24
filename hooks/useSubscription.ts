import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionStatus {
  isSubscribed: boolean;
  hasLifetimeAccess: boolean;
  subscriptionType: 'free' | 'annual' | 'lifetime';
  loading: boolean;
}

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    isSubscribed: false,
    hasLifetimeAccess: false,
    subscriptionType: 'free',
    loading: true,
  });

  // Helper to get cached subscription status
  const getCachedSubscription = (userId: string): SubscriptionStatus | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(`riverwalks_subscription_${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  // Helper to cache subscription status
  const cacheSubscription = (userId: string, subscription: SubscriptionStatus) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`riverwalks_subscription_${userId}`, JSON.stringify({
        ...subscription,
        cachedAt: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache subscription status:', error);
    }
  };

  // Helper to check if we're online
  const isOnline = () => {
    return typeof navigator !== 'undefined' && navigator.onLine;
  };

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setStatus({
            isSubscribed: false,
            hasLifetimeAccess: false,
            subscriptionType: 'free',
            loading: false,
          });
          return;
        }

        // If offline, try to use cached subscription data
        if (!isOnline()) {
          console.log('🔌 Offline - checking for cached subscription data');
          const cachedStatus = getCachedSubscription(user.id);
          if (cachedStatus) {
            console.log('✅ Using cached subscription status:', cachedStatus);
            setStatus({
              ...cachedStatus,
              loading: false
            });
            return;
          } else {
            console.log('⚠️ No cached subscription data available, defaulting to free');
            setStatus({
              isSubscribed: false,
              hasLifetimeAccess: false,
              subscriptionType: 'free',
              loading: false,
            });
            return;
          }
        }

        // Check if user has a subscription record
        console.log('🔍 Checking subscription for authenticated user');
        
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
      } catch (error) {
        console.error('Error checking subscription status:', error);
        
        // Try to use cached data if available, otherwise default to free
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
        
        // No cached data available, default to free
        setStatus({
          isSubscribed: false,
          hasLifetimeAccess: false,
          subscriptionType: 'free',
          loading: false,
        });
      }
    };

    checkSubscription();
  }, []);

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