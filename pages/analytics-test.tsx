import { useState } from 'react';
import Head from 'next/head';
import { 
  trackButtonClick, 
  trackFormSubmission, 
  trackEvent, 
  trackFileDownload, 
  trackSearch 
} from '../lib/analytics';
import { AnalyticsDashboard } from '../components/analytics/AnalyticsDashboard';

export default function AnalyticsTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testButtonClick = () => {
    trackButtonClick('test_button', 'analytics_test_page');
    addResult('Button click tracked');
  };

  const testFormSubmission = () => {
    trackFormSubmission('test_form', true);
    addResult('Form submission tracked');
  };

  const testCustomEvent = () => {
    trackEvent('custom_test_event', {
      test_property: 'test_value',
      timestamp: new Date().toISOString()
    });
    addResult('Custom event tracked');
  };

  const testFileDownload = () => {
    trackFileDownload('pdf', 'test_report.pdf');
    addResult('File download tracked');
  };

  const testSearch = () => {
    trackSearch('river study', 5);
    addResult('Search event tracked');
  };

  const testAnalyticsReport = async () => {
    try {
      const response = await fetch('/api/analytics/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          period: '7d', 
          email: 'test@example.com',
          type: 'manual'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        addResult('Analytics report generated successfully');
      } else {
        addResult('Analytics report failed: ' + result.error);
      }
    } catch (error) {
      addResult('Analytics report error: ' + error);
    }
  };

  return (
    <>
      <Head>
        <title>Analytics Testing - Riverwalks</title>
        <meta name="description" content="Test Google Analytics 4 implementation" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Testing</h1>
            <p className="text-gray-600">Test Google Analytics 4 events and reporting</p>
          </div>

          {/* Test Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Testing</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={testButtonClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Button Click
              </button>
              
              <button
                onClick={testFormSubmission}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Form Submission
              </button>
              
              <button
                onClick={testCustomEvent}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Custom Event
              </button>
              
              <button
                onClick={testFileDownload}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test File Download
              </button>
              
              <button
                onClick={testSearch}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Search Event
              </button>
              
              <button
                onClick={testAnalyticsReport}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Test Analytics Report
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {testResults.length === 0 ? (
                <p className="text-gray-500 italic">Click the buttons above to test analytics events</p>
              ) : (
                testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {result}
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setTestResults([])}
              className="mt-4 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Results
            </button>
          </div>

          {/* GDPR Compliance Check */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">GDPR Compliance Status</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Cookie consent implemented</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Analytics only loads with user consent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Privacy policy and cookie policy available</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">User can modify consent preferences</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Set GA_MEASUREMENT_ID in environment variables</span>
              </div>
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
              <p className="text-sm text-gray-600">Mock dashboard showing what analytics data would look like</p>
            </div>
            <AnalyticsDashboard />
          </div>

          {/* Setup Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Create a Google Analytics 4 property in <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Analytics</a></li>
              <li>Copy your Measurement ID (format: G-XXXXXXXXXX)</li>
              <li>Add it to your .env.local file: <code className="bg-blue-100 px-1 rounded">NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX</code></li>
              <li>Deploy your changes and test the analytics</li>
              <li>Check Google Analytics Real-time reports to see events</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
}