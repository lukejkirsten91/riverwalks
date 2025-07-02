import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const SubscriptionSuccessPage: React.FC = () => {
  const router = useRouter();
  const { session_id } = router.query;
  const [sessionDetails, setSessionDetails] = useState<any>(null);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Payment Successful! 🎉
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          Welcome to Riverwalks! Your subscription is now active.
        </p>

        {/* Payment Details */}
        {sessionDetails && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 text-left">
            <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
            <div className="space-y-2 text-gray-600">
              <p><strong>Session ID:</strong> {sessionDetails.id}</p>
              <p><strong>Amount:</strong> £{(sessionDetails.amount_total / 100).toFixed(2)}</p>
              <p><strong>Status:</strong> <span className="text-green-600 font-medium">Completed</span></p>
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">What's Next?</h3>
          <ul className="text-left space-y-2 text-blue-800">
            <li className="flex items-center">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3">1</span>
              Start documenting your river studies
            </li>
            <li className="flex items-center">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3">2</span>
              Generate professional PDF reports
            </li>
            <li className="flex items-center">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3">3</span>
              Export data for further analysis
            </li>
            <li className="flex items-center">
              <span className="w-5 h-5 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-sm mr-3">4</span>
              Collaborate with classmates if needed
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/river-walks" className="inline-block">
            <button className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
              Start Using Riverwalks
            </button>
          </Link>
          
          <Link href="/" className="inline-block">
            <button className="w-full sm:w-auto px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
              Return to Home
            </button>
          </Link>
        </div>

        {/* Support Information */}
        <div className="mt-12 text-sm text-gray-500">
          <p className="mb-2">
            Need help? Contact us at support@riverwalks.co.uk
          </p>
          <p>
            You'll receive a receipt email shortly with your payment details.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccessPage;