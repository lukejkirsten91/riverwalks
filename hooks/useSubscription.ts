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
  return true; // Excel export is now free for all users
}

export function canAccessAdvancedFeatures(subscription: SubscriptionStatus): boolean {
  return subscription.isSubscribed;
}