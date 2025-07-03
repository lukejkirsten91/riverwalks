import React from 'react';
import Link from 'next/link';
import { Crown, Info } from 'lucide-react';
import { SubscriptionStatus } from '../../hooks/useSubscription';

interface SubscriptionBadgeProps {
  subscription: SubscriptionStatus;
  userEmail?: string;
}

export function SubscriptionBadge({ subscription, userEmail }: SubscriptionBadgeProps) {
  const { isSubscribed, hasLifetimeAccess, subscriptionType, loading } = subscription;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  // Calculate days remaining for annual subscriptions
  const getDaysRemaining = () => {
    // This would come from the subscription end date in a real implementation
    // For now, returning a placeholder
    return 365; // Replace with actual calculation
  };

  if (!isSubscribed) {
    // Basic user - encourage upgrade
    return (
      <Link href="/subscription">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer group">
          <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">B</span>
          </div>
          <span className="text-sm font-medium text-blue-700 group-hover:text-blue-800">
            Basic RiverWalker
          </span>
          <Info className="w-3 h-3 text-blue-500 opacity-60" />
          
          {/* Tooltip */}
          <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 w-64 pointer-events-none">
            <div className="text-sm">
              <p className="font-semibold text-gray-900 mb-1">Basic Plan</p>
              <p className="text-gray-600 mb-2">✓ Create unlimited river walks</p>
              <p className="text-gray-600 mb-2">✓ Add sites and measurements</p>
              <p className="text-gray-600 mb-3">✓ Collaborate with others</p>
              <p className="text-blue-600 font-medium">Click to upgrade for reports & export!</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  if (hasLifetimeAccess) {
    // Lifetime Pro user
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg relative group">
        <Crown className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-800">
          Pro RiverWalker for life
        </span>
        <Info className="w-3 h-3 text-amber-500 opacity-60" />
        
        {/* Tooltip */}
        <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 w-64 pointer-events-none">
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Pro Lifetime</p>
            <p className="text-gray-600 mb-1">✓ All Basic features</p>
            <p className="text-gray-600 mb-1">✓ Professional PDF reports</p>
            <p className="text-gray-600 mb-1">✓ Excel data export</p>
            <p className="text-gray-600 mb-1">✓ Advanced sharing</p>
            <p className="text-amber-600 font-medium">Never expires!</p>
          </div>
        </div>
      </div>
    );
  }

  // Annual Pro user
  const daysRemaining = getDaysRemaining();
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg relative group">
      <Crown className="w-4 h-4 text-green-600" />
      <span className="text-sm font-medium text-green-800">
        Pro RiverWalker for {daysRemaining} days
      </span>
      <Info className="w-3 h-3 text-green-500 opacity-60" />
      
      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-lg p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 w-64 pointer-events-none">
        <div className="text-sm">
          <p className="font-semibold text-gray-900 mb-1">Pro Annual</p>
          <p className="text-gray-600 mb-1">✓ All Basic features</p>
          <p className="text-gray-600 mb-1">✓ Professional PDF reports</p>
          <p className="text-gray-600 mb-1">✓ Excel data export</p>
          <p className="text-gray-600 mb-1">✓ Advanced sharing</p>
          <p className="text-green-600 font-medium">{daysRemaining} days remaining</p>
        </div>
      </div>
    </div>
  );
}