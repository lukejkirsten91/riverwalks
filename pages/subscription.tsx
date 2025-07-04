import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useRouter } from 'next/router';
import { getCurrentPublishableKey, getCurrentPrices, logStripeConfig, validateStripeConfig } from '../lib/stripe-config';

// Initialize Stripe with centralized configuration
const stripeKey = getCurrentPublishableKey();
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const SubscriptionPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState<any>(null);
  const router = useRouter();

  // Get current price configuration (test or live mode)
  const currentPrices = getCurrentPrices();
  const plans = {
    yearly: {
      name: 'Annual Access',
      price: 199, // £1.99 in pence
      duration: '1 year',
      priceId: currentPrices.annual,
    },
    lifetime: {
      name: 'Lifetime Access', 
      price: 349, // £3.49 in pence
      duration: 'Forever',
      priceId: currentPrices.lifetime,
    }
  };

  // Log configuration on mount (for debugging)
  useEffect(() => {
    logStripeConfig();
    const config = validateStripeConfig();
    if (!config.isValid) {
      console.error('❌ Stripe configuration incomplete:', config.missingKeys);
    }
  }, []);

  const handleCheckout = async (planType: 'yearly' | 'lifetime') => {
    setLoading(planType);
    
    try {
      console.log('🚀 Starting checkout for plan:', planType);
      
      // Check if discount makes this free (100% discount)
      if (discount) {
        const originalPrice = plans[planType].price / 100;
        let discountedPrice = originalPrice;
        
        if (discount.type === 'percentage') {
          discountedPrice = originalPrice * (1 - discount.percentage / 100);
        } else if (discount.type === 'fixed_amount') {
          discountedPrice = Math.max(0, originalPrice - (discount.fixedAmount / 100));
        }
        
        // If fully discounted, skip Stripe and go direct to success
        if (discountedPrice === 0) {
          router.push(`/subscription/success?plan=${planType}&voucher=${encodeURIComponent(voucherCode)}&free=true`);
          return;
        }
      }
      
      if (!stripePromise) {
        console.error('❌ Stripe not initialized - missing publishable key');
        throw new Error('Stripe configuration error - missing publishable key');
      }
      
      const stripe = await stripePromise;
      if (!stripe) {
        console.error('❌ Stripe failed to load');
        throw new Error('Stripe failed to load');
      }
      console.log('✅ Stripe loaded successfully');

      console.log('💰 Plan:', planType);
      console.log('🎫 Voucher:', voucherCode || 'None');

      // Create checkout session with backend API (supports vouchers)
      const successUrl = `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}&plan=${planType}${voucherCode ? `&voucher=${encodeURIComponent(voucherCode)}` : ''}`;
      const cancelUrl = `${window.location.origin}/subscription`;

      console.log('🔗 URLs:', { successUrl, cancelUrl });

      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          voucherCode: voucherCode || null,
          successUrl,
          cancelUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Checkout creation failed:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }

      console.log('✅ Checkout session created:', data.sessionId);

      // Redirect to Stripe checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: data.sessionId,
      });

      if (error) {
        console.error('❌ Stripe checkout error:', error);
        alert(`Stripe checkout failed: ${error.message || 'Unknown error'}`);
      } else {
        console.log('✅ Checkout initiated successfully');
      }
    } catch (error) {
      console.error('💥 Checkout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Something went wrong: ${errorMessage}`);
    } finally {
      setLoading(null);
    }
  };

  const validateVoucher = async () => {
    if (!voucherCode.trim()) {
      alert('Please enter a voucher code');
      return;
    }

    try {
      const response = await fetch('/api/vouchers/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: voucherCode.toUpperCase(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setDiscount({
          code: data.voucher.code,
          percentage: data.voucher.discount_type === 'percentage' ? data.voucher.discount_value : 0,
          fixedAmount: data.voucher.discount_type === 'fixed_amount' ? data.voucher.discount_value : 0,
          type: data.voucher.discount_type,
        });
      } else {
        alert(data.error || 'Invalid voucher code');
        setDiscount(null);
      }
    } catch (error) {
      console.error('Error validating voucher:', error);
      alert('Failed to validate voucher. Please try again.');
      setDiscount(null);
    }
  };

  const formatPrice = (pence: number, discount?: any) => {
    const originalPrice = pence / 100;
    
    if (discount) {
      let discountedPrice = originalPrice;
      
      if (discount.type === 'percentage') {
        discountedPrice = originalPrice * (1 - discount.percentage / 100);
      } else if (discount.type === 'fixed_amount') {
        discountedPrice = Math.max(0, originalPrice - (discount.fixedAmount / 100));
      }
      
      return (
        <span>
          <span className="line-through text-gray-500">£{originalPrice.toFixed(2)}</span>
          {' '}
          <span className="text-green-600 font-bold">£{discountedPrice.toFixed(2)}</span>
        </span>
      );
    }
    return `£${originalPrice.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-4 sm:py-8 lg:py-12 px-4" data-version="v2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-4">
            Choose Your Riverwalks Plan
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            Professional river study documentation for GCSE Geography students
          </p>
        </div>

        {/* Voucher Code Section */}
        <div className="max-w-md mx-auto mb-6 sm:mb-8 p-4 sm:p-6 bg-white rounded-lg shadow-lg">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Have a voucher code?</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Enter voucher code"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[44px]"
            />
            <button
              onClick={validateVoucher}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px] font-medium"
            >
              Apply
            </button>
          </div>
          {discount && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">
                🎉 {discount.percentage}% discount applied with code "{discount.code}"
              </p>
            </div>
          )}
        </div>

        {/* Pricing Plans */}
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Annual Plan */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border-2 border-gray-200 hover:border-blue-300 transition-colors">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Annual Access</h3>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">
                {formatPrice(plans.yearly.price, discount)}
              </div>
              <p className="text-sm sm:text-base text-gray-600">Perfect for current GCSE students</p>
            </div>
            
            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Unlimited river walk documentation
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Professional PDF report generation
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Excel data export for analysis
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Collaboration with classmates
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                12 months of access
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('yearly')}
              disabled={loading === 'yearly'}
              className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px] touch-manipulation"
            >
              {loading === 'yearly' ? 'Processing...' : 'Choose Annual Plan'}
            </button>
          </div>

          {/* Lifetime Plan */}
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8 border-2 border-teal-300 relative hover:border-teal-400 transition-colors">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-teal-600 text-white px-3 sm:px-4 py-1 rounded-full text-xs sm:text-sm font-medium">
                Best Value
              </span>
            </div>
            
            <div className="text-center mb-4 sm:mb-6 pt-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Lifetime Access</h3>
              <div className="text-3xl sm:text-4xl font-bold text-teal-600 mb-2">
                {formatPrice(plans.lifetime.price, discount)}
              </div>
              <p className="text-sm sm:text-base text-gray-600">For students and future reference</p>
            </div>
            
            <ul className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Everything in Annual Plan
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                <strong>Lifetime access</strong> - never expires
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Perfect for future studies
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                One-time payment, no renewals
              </li>
              <li className="flex items-center text-gray-700 text-sm sm:text-base">
                <span className="w-5 h-5 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">✓</span>
                Save £0.49 vs. 2 annual plans
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={loading === 'lifetime'}
              className="w-full py-3 px-6 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[48px] touch-manipulation"
            >
              {loading === 'lifetime' ? 'Processing...' : 'Choose Lifetime Plan'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 text-gray-600 px-4">
          <p className="mb-2 text-sm sm:text-base">
            🔒 Secure payment processing by Stripe
          </p>
          <p className="text-xs sm:text-sm">
            All purchases include access to professional report generation and data export features
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;