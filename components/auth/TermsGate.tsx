import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '@supabase/supabase-js';
import { TermsAcceptance } from './TermsAcceptance';
import { getUserAgreement, recordTermsAcceptance, getClientIP } from '../../lib/api/agreements';
import { useToast } from '../ui/ToastProvider';
import type { TermsAcceptanceData, UserAgreement } from '../../types';

interface TermsGateProps {
  user: User;
  children: React.ReactNode;
}

export function TermsGate({ user, children }: TermsGateProps) {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkTermsAcceptance();
  }, [user.id]);

  const checkTermsAcceptance = async () => {
    try {
      setLoading(true);
      const agreement = await getUserAgreement(user.id);
      
      // Check if user needs to accept terms
      const hasAcceptedTerms = agreement?.terms_accepted_at != null;
      const hasAcceptedPrivacy = agreement?.privacy_accepted_at != null;
      
      setNeedsAcceptance(!hasAcceptedTerms || !hasAcceptedPrivacy);
    } catch (error) {
      console.error('Error checking terms acceptance:', error);
      // If there's an error checking, assume they need to accept
      setNeedsAcceptance(true);
    } finally {
      setLoading(false);
    }
  };

  const handleTermsAcceptance = async (acceptanceData: TermsAcceptanceData) => {
    try {
      setSubmitting(true);
      
      // Get client information for legal evidence
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
      
      // Record the acceptance in the database
      await recordTermsAcceptance(
        user.id,
        acceptanceData,
        undefined, // IP address would be handled server-side in a real API
        userAgent
      );

      showSuccess('Welcome to Riverwalks!');
      
      // Hide the terms gate
      setNeedsAcceptance(false);
      
    } catch (error) {
      console.error('Error recording terms acceptance:', error);
      showError('Could not record acceptance');
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while checking
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Setting up your account</h3>
            <p className="text-sm text-muted-foreground">
              Checking your legal agreements...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show terms acceptance if needed
  if (needsAcceptance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Welcome Header */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Your avatar"
                    className="w-16 h-16 rounded-full shadow-lg border-4 border-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                Welcome to Riverwalks!
              </h1>
              <p className="text-muted-foreground mb-4">
                Hi {user.user_metadata?.full_name || user.email?.split('@')[0]}! 
                Before you can start using Riverwalks, please review and accept our legal agreements.
              </p>
              
              {/* Transparent pricing info */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-lg mx-auto">
                <h3 className="text-green-800 font-medium text-sm mb-2">💳 About Our Pricing</h3>
                <p className="text-green-700 text-sm">
                  You can create an account and test all features completely free. If you want to generate reports 
                  or export your data for coursework, we charge a small fee (£1.99/year or £3.49 lifetime) to keep the platform running.
                </p>
              </div>
            </div>

            {/* Terms Acceptance Component */}
            <TermsAcceptance 
              onAcceptance={handleTermsAcceptance}
              loading={submitting}
              required={true}
            />
          </div>
        </div>
      </div>
    );
  }

  // User has accepted terms, show the main app
  return <>{children}</>;
}