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
        console.log('🔍 Checking subscription for user:', user.email, 'ID:', user.id);
        
        // Try to get subscription - use RPC call to bypass RLS if needed
        let subscription = null;
        let error = null;
        
        try {
          const result = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .single();
          
          subscription = result.data;
          error = result.error;
        } catch (rpcError) {
          console.error('❌ RLS blocking subscription access, trying alternative approach:', rpcError);
          
          // Alternative: Try without single() to avoid RLS issues
          try {
            const fallbackResult = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .limit(1);
            
            subscription = fallbackResult.data?.[0] || null;
            error = fallbackResult.error;
          } catch (fallbackError) {
            console.error('❌ Fallback subscription query also failed:', fallbackError);
          }
        }

        console.log('📊 Subscription query result:', { subscription, error });

        if (error && error.code !== 'PGRST116') {
          console.error('❌ Error checking subscription:', error);
        }

        const isSubscribed = !!subscription;
        const hasLifetimeAccess = subscription?.subscription_type === 'lifetime';
        const subscriptionType = subscription?.subscription_type || 'free';

        console.log('✅ Final subscription status:', {
          isSubscribed,
          hasLifetimeAccess,
          subscriptionType,
          subscriptionData: subscription
        });

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