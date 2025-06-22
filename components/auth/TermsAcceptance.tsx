import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Scale, Shield } from 'lucide-react';
import type { TermsAcceptanceData } from '../../types';

interface TermsAcceptanceProps {
  onAcceptance: (data: TermsAcceptanceData) => void;
  loading?: boolean;
  required?: boolean;
}

export function TermsAcceptance({ onAcceptance, loading = false, required = true }: TermsAcceptanceProps) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const canProceed = termsAccepted && privacyAccepted;

  const handleSubmit = () => {
    if (!canProceed) return;
    
    onAcceptance({
      terms_accepted: termsAccepted,
      privacy_accepted: privacyAccepted,
      marketing_consent: marketingConsent,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
          <Scale className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Legal Agreements</h3>
          <p className="text-sm text-muted-foreground">
            Please review and accept our terms to continue
          </p>
        </div>
      </div>

      {/* Educational Context */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Educational Privacy Protection</h4>
            <p className="text-sm text-blue-800">
              Riverwalks is designed specifically for GCSE Geography students. We comply with 
              GDPR, COPPA, and UK education privacy laws to protect student data.
            </p>
          </div>
        </div>
      </div>

      {/* Required Agreements */}
      <div className="space-y-4 mb-6">
        {/* Terms of Service */}
        <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
              disabled={loading}
            />
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {termsAccepted ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-900">Terms of Service</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              I agree to the educational use terms, subscription details, and service conditions.
            </p>
            <Link 
              href="/terms" 
              target="_blank"
              className="text-sm text-primary hover:text-primary/80 hover:underline"
            >
              Read Terms of Service →
            </Link>
          </div>
        </div>

        {/* Privacy Policy */}
        <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
              disabled={loading}
            />
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {privacyAccepted ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium text-gray-900">Privacy Policy</span>
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Required</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              I understand how my educational data is collected, used, and protected.
            </p>
            <Link 
              href="/privacy" 
              target="_blank"
              className="text-sm text-primary hover:text-primary/80 hover:underline"
            >
              Read Privacy Policy →
            </Link>
          </div>
        </div>

        {/* Optional Marketing Consent */}
        <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
              className="w-5 h-5 text-primary focus:ring-primary border-gray-300 rounded"
              disabled={loading}
            />
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">Educational Updates</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">Optional</span>
            </div>
            <p className="text-sm text-gray-600">
              Receive helpful GCSE Geography tips, study resources, and product updates via email. 
              You can unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSubmit}
          disabled={!canProceed || loading}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            canProceed && !loading
              ? 'bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Creating Account...
            </div>
          ) : (
            'Accept and Continue'
          )}
        </button>
      </div>

      {/* Legal Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          By creating an account, you acknowledge that you have read and understood our legal agreements. 
          For questions, contact{' '}
          <a href="mailto:privacy@riverwalks.co.uk" className="text-primary hover:underline">
            privacy@riverwalks.co.uk
          </a>
        </p>
      </div>
    </div>
  );
}