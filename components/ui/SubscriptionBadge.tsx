import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Crown, Info } from 'lucide-react';
import { SubscriptionStatus } from '../../hooks/useSubscription';

interface SubscriptionBadgeProps {
  subscription: SubscriptionStatus;
  userEmail?: string;
  compact?: boolean; // For mobile version
}

export function SubscriptionBadge({ subscription, userEmail, compact = false }: SubscriptionBadgeProps) {
  const { isSubscribed, hasLifetimeAccess, subscriptionType, loading } = subscription;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{top: number, left: number} | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Handle tooltip positioning
  const handleMouseEnter = () => {
    if (badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTooltip && badgeRef.current && !badgeRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 bg-gray-100 rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}>
        <div className="w-4 h-4 bg-gray-300 rounded animate-pulse"></div>
        {!compact && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
    );
  }

  // Calculate days remaining for annual subscriptions
  const getDaysRemaining = () => {
    if (!subscription.currentPeriodEnd) {
      // If no end date available for annual subscription, assume it's valid for now
      console.warn('No currentPeriodEnd available for annual subscription');
      return 365; // Default to showing as active
    }
    
    const endDate = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    
    // Check if the date is valid
    if (isNaN(endDate.getTime())) {
      console.warn('Invalid currentPeriodEnd date:', subscription.currentPeriodEnd);
      return 365; // Default to showing as active
    }
    
    const timeDiff = endDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    console.log('Subscription end date:', endDate, 'Days remaining:', daysDiff);
    return Math.max(0, daysDiff);
  };

  // Tooltip component for portals
  const TooltipContent = ({ children }: { children: React.ReactNode }) => {
    if (!showTooltip || !tooltipPosition || typeof window === 'undefined') return null;
    
    return createPortal(
      <div 
        className="fixed bg-white border border-gray-200 rounded-lg p-3 shadow-modern opacity-100 z-[99999] w-64 animate-in slide-in-from-top-2 fade-in-0 duration-200"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {children}
      </div>,
      document.body
    );
  };

  if (!isSubscribed) {
    // Basic user - encourage upgrade
    return (
      <>
        <Link href="/subscription">
          <div 
            ref={badgeRef}
            className={`flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-tutorial="upgrade"
          >
            <div className="w-4 h-4 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">B</span>
            </div>
            {compact ? (
              <>
                <span className="text-xs font-medium text-blue-700 hover:text-blue-800 truncate">
                  Basic
                </span>
                <Info className="w-3 h-3 text-blue-500 opacity-60 flex-shrink-0" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-blue-700 hover:text-blue-800">
                  Basic RiverWalker
                </span>
                <Info className="w-3 h-3 text-blue-500 opacity-60" />
              </>
            )}
          </div>
        </Link>
        
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Basic Plan</p>
            <p className="text-gray-600 mb-2">✓ Create unlimited river walks</p>
            <p className="text-gray-600 mb-2">✓ Add sites and measurements</p>
            <p className="text-gray-600 mb-2">✓ Basic data export</p>
            <p className="text-blue-600 font-medium">Click to upgrade for premium PDF reports & collaboration!</p>
          </div>
        </TooltipContent>
      </>
    );
  }

  if (hasLifetimeAccess) {
    // Lifetime Pro user
    return (
      <>
        <div 
          ref={badgeRef}
          className={`flex items-center gap-2 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Crown className="w-4 h-4 text-blue-600 flex-shrink-0" />
          {compact ? (
            <>
              <span className="text-xs font-medium text-blue-800 truncate">
                Pro
              </span>
              <Info className="w-3 h-3 text-blue-500 opacity-60 flex-shrink-0" />
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-blue-800">
                Pro RiverWalker for life
              </span>
              <Info className="w-3 h-3 text-blue-500 opacity-60" />
            </>
          )}
        </div>
        
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Pro Lifetime</p>
            <p className="text-gray-600 mb-1">✓ All Basic features</p>
            <p className="text-gray-600 mb-1">✓ Professional PDF reports</p>
            <p className="text-gray-600 mb-1">✓ Excel data export</p>
            <p className="text-gray-600 mb-1">✓ Advanced sharing</p>
            <p className="text-amber-600 font-medium">Never expires!</p>
          </div>
        </TooltipContent>
      </>
    );
  }

  // Annual Pro user - check if subscription has expired
  const daysRemaining = getDaysRemaining();
  
  // If subscription has expired, show as basic user
  if (daysRemaining <= 0 && subscription.subscriptionType === 'annual') {
    return (
      <>
        <Link href="/subscription">
          <div 
            ref={badgeRef}
            className={`flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="w-4 h-4 bg-red-400 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-white font-bold">!</span>
            </div>
            {compact ? (
              <>
                <span className="text-xs font-medium text-red-700 hover:text-red-800 truncate">
                  Expired
                </span>
                <Info className="w-3 h-3 text-red-500 opacity-60 flex-shrink-0" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium text-red-700 hover:text-red-800">
                  Subscription Expired
                </span>
                <Info className="w-3 h-3 text-red-500 opacity-60" />
              </>
            )}
          </div>
        </Link>
        
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-1">Subscription Expired</p>
            <p className="text-gray-600 mb-2">Your Pro subscription has ended</p>
            <p className="text-gray-600 mb-2">✓ You can still create unlimited river walks</p>
            <p className="text-gray-600 mb-2">✓ Basic data export available</p>
            <p className="text-red-600 font-medium">Click to renew for premium features!</p>
          </div>
        </TooltipContent>
      </>
    );
  }
  
  return (
    <>
      <div 
        ref={badgeRef}
        className={`flex items-center gap-2 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Crown className="w-4 h-4 text-cyan-600 flex-shrink-0" />
        {compact ? (
          <>
            <span className="text-xs font-medium text-cyan-800 truncate">
              Pro {daysRemaining}d
            </span>
            <Info className="w-3 h-3 text-cyan-500 opacity-60 flex-shrink-0" />
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-cyan-800">
              Pro RiverWalker for {daysRemaining} days
            </span>
            <Info className="w-3 h-3 text-cyan-500 opacity-60" />
          </>
        )}
      </div>
      
      <TooltipContent>
        <div className="text-sm">
          <p className="font-semibold text-gray-900 mb-1">Pro Annual</p>
          <p className="text-gray-600 mb-1">✓ All Basic features</p>
          <p className="text-gray-600 mb-1">✓ Professional PDF reports</p>
          <p className="text-gray-600 mb-1">✓ Excel data export</p>
          <p className="text-gray-600 mb-1">✓ Advanced sharing</p>
          <p className="text-green-600 font-medium">{daysRemaining} days remaining</p>
        </div>
      </TooltipContent>
    </>
  );
}