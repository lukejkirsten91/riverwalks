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

        // Check if user has a subscription record
        const { data: subscription, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking subscription:', error);
        }

        const isSubscribed = !!subscription;
        const hasLifetimeAccess = subscription?.subscription_type === 'lifetime';
        const subscriptionType = subscription?.subscription_type || 'free';

        setStatus({
          isSubscribed,
          hasLifetimeAccess,
          subscriptionType: subscriptionType as 'free' | 'annual' | 'lifetime',
          loading: false,
        });
      } catch (error) {
        console.error('Error checking subscription status:', error);
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
  return subscription.isSubscribed;
}

export function canAccessAdvancedFeatures(subscription: SubscriptionStatus): boolean {
  return subscription.isSubscribed;
}