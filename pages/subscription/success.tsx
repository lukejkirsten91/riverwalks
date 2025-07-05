import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const SubscriptionSuccessPage: React.FC = () => {
  const router = useRouter();
  const { session_id, free, plan, voucher } = router.query;
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const isFreeAccess = free === 'true';

  useEffect(() => {
    if (session_id) {
      // In the future, we'll fetch session details from our API
      // For now, just show a success message
      setSessionDetails({ 
        id: session_id,
        amount_total: 199, // This would come from the actual session
        customer_email: 'user@example.com' // This would come from the actual session
      });
    }
  }, [session_id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 py-6 sm:py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
          {isFreeAccess ? 'Access Granted! 🎉' : 'Payment Successful! 🎉'}
        </h1>
        
        <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 px-2">
          {isFreeAccess 
            ? 'Welcome to Riverwalks! Your free access is now active.'
            : 'Welcome to Riverwalks! Your subscription is now active.'
          }
        </p>

        {/* Payment Details */}
        {!isFreeAccess && sessionDetails && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Payment Details</h3>
            <div className="space-y-2 text-gray-600 text-sm sm:text-base">
              <p><strong>Session ID:</strong> <span className="break-all">{sessionDetails.id}</span></p>
              <p><strong>Amount:</strong> £{(sessionDetails.amount_total / 100).toFixed(2)}</p>
              <p><strong>Status:</strong> <span className="text-green-600 font-medium">Completed</span></p>
            </div>
          </div>
        )}
        
        {/* Free Access Details */}
        {isFreeAccess && (
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 text-left">
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Access Details</h3>
            <div className="space-y-2 text-gray-600 text-sm sm:text-base">
              <p><strong>Plan:</strong> {plan === 'yearly' ? 'Annual Access' : 'Lifetime Access'}</p>
              <p><strong>Voucher:</strong> {voucher}</p>
              <p><strong>Amount:</strong> £0.00 (100% discount applied)</p>
              <p><strong>Status:</strong> <span className="text-green-600 font-medium">Active</span></p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-3 sm:mb-4">What's Next?</h3>
          <ul className="text-left space-y-2 sm:space-y-3 text-blue-800">
            <li className="flex items-center text-sm sm:text-base">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">1</span>
              Start documenting your river studies
            </li>
            <li className="flex items-center text-sm sm:text-base">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">2</span>
              Generate professional PDF reports
            </li>
            <li className="flex items-center text-sm sm:text-base">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">3</span>
              Export data for further analysis
            </li>
            <li className="flex items-center text-sm sm:text-base">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">4</span>
              Collaborate with classmates if needed
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
          <Link href="/river-walks" className="inline-block">
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors min-h-[48px] touch-manipulation">
              Start Using Riverwalks
            </button>
          </Link>
          
          <Link href="/" className="inline-block">
            <button className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors min-h-[48px] touch-manipulation">
              Return to Home
            </button>
          </Link>
        </div>

        {/* Support Information */}
        <div className="mt-8 sm:mt-12 text-xs sm:text-sm text-gray-500 px-4">
          <p className="mb-2">
            Need help? Contact us at support@riverwalks.co.uk
          </p>
          {!isFreeAccess && (
            <p>
              You'll receive a receipt email shortly with your payment details.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;