import React from 'react';
import Link from 'next/link';
import { Crown, Calendar, Zap, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { SubscriptionStatus } from '../../hooks/useSubscription';

interface SubscriptionStatusCardProps {
  subscription: SubscriptionStatus;
  userEmail?: string;
  className?: string;
}

export function SubscriptionStatusCard({ subscription, userEmail, className = '' }: SubscriptionStatusCardProps) {
  const { isSubscribed, hasLifetimeAccess, subscriptionType, loading } = subscription;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-modern p-6 border border-gray-200 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Free user card
  if (!isSubscribed) {
    return (
      <div className={`bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg shadow-modern p-6 border border-blue-200 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Basic RiverWalker</h3>
                <p className="text-sm text-blue-600">Free Plan</p>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Unlimited river walks</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Data collection & storage</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Offline functionality</span>
              </div>
              <div className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                <span className="text-gray-700">Basic data export</span>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Crown className="w-4 h-4 text-blue-600 mr-2" />
                Unlock Premium Features
              </h4>
              <ul className="text-sm text-gray-600 space-y-1 mb-3">
                <li>• Premium PDF reports</li>
                <li>• Advanced data export options</li>
                <li>• River walk collaboration</li>
                <li>• Enhanced visualizations</li>
              </ul>
              <div className="text-xs text-blue-600 font-medium">
                Starting at £1.99/year (less than 40p/month!)
              </div>
            </div>
          </div>
        </div>

        <Link href="/subscription">
          <button className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2">
            <Crown className="w-4 h-4" />
            Upgrade to Premium
          </button>
        </Link>
      </div>
    );
  }

  // Premium user cards
  const isPremium = true;
  const isLifetime = hasLifetimeAccess;
  const isAnnual = subscriptionType === 'annual';

  return (
    <div className={`bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-modern p-6 border border-amber-200 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mr-3">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900 flex items-center gap-2">
              Pro RiverWalker
              {isLifetime && <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">LIFETIME</span>}
            </h3>
            <p className="text-sm text-amber-600">
              {isLifetime ? 'Lifetime Access' : 'Annual Subscription'}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-xs text-amber-600 font-medium">Status</div>
          <div className="flex items-center text-sm font-semibold text-amber-900">
            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
            Active
          </div>
        </div>
      </div>

      {/* Subscription details */}
      <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1">Plan Type</div>
            <div className="text-sm font-semibold text-gray-900">
              {isLifetime ? 'Lifetime Access' : 'Annual Plan'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium mb-1">
              {isLifetime ? 'Purchased' : 'Renews'}
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {isLifetime ? 'One-time payment' : 'Annually'}
            </div>
          </div>
        </div>
      </div>

      {/* Premium features */}
      <div className="space-y-2 mb-4">
        <h4 className="font-semibold text-amber-900 text-sm mb-2">Your Premium Features:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700">PDF Reports</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700">Excel Export</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700">River Sharing</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
            <span className="text-gray-700">Collaboration</span>
          </div>
        </div>
      </div>

      {/* Thank you message */}
      <div className="bg-amber-100 rounded-lg p-3 border border-amber-200">
        <p className="text-xs text-amber-800 text-center">
          <span className="font-semibold">Thank you for supporting Riverwalks!</span>
          <br />
          You're helping us build better tools for Geography education.
        </p>
      </div>
    </div>
  );
}