import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Cookie, Settings, BarChart3, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useCookieConsent } from '../contexts/CookieConsentContext';

export default function CookiePolicy() {
  const { consent, setAnalyticsConsent, setMarketingConsent } = useCookieConsent();
  const [showSaveMessage, setShowSaveMessage] = useState(false);

  const handleSavePreferences = () => {
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  return (
    <>
      <Head>
        <title>Cookie Policy - Riverwalks</title>
        <meta name="description" content="Cookie Policy for Riverwalks - Managing cookies and tracking for GCSE Geography students" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Cookie Policy</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-modern p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Cookie className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Cookie Preferences Panel */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3 mb-4">
                <Settings className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Cookie Preferences</h3>
                  <p className="text-sm text-amber-800">
                    Manage your cookie preferences below. Essential cookies are required for the service to function.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Essential Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Essential Cookies</h4>
                    <p className="text-sm text-gray-600">Required for authentication and core functionality</p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Always Active</span>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Functional Cookies</h4>
                    <p className="text-sm text-gray-600">Remember your preferences and settings</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.essential}
                      className="sr-only peer"
                      disabled
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Analytics Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Analytics Cookies</h4>
                    <p className="text-sm text-gray-600">Help us understand how you use the service</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.analytics}
                      onChange={(e) => setAnalyticsConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Marketing Cookies */}
                <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                  <div>
                    <h4 className="font-medium text-gray-900">Marketing Cookies</h4>
                    <p className="text-sm text-gray-600">Personalized content and educational resources</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consent.marketing}
                      onChange={(e) => setMarketingConsent(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleSavePreferences}
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  {showSaveMessage ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    'Save Preferences'
                  )}
                </button>
              </div>
            </div>

            {/* Cookie Policy Content */}
            <div className="prose prose-gray max-w-none">
              <h2>1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are placed on your device when you visit our website. 
                They help us provide you with a better experience by remembering your preferences and 
                understanding how you use our service.
              </p>

              <h2>2. Why We Use Cookies</h2>
              <p>
                Riverwalks uses cookies for several important purposes:
              </p>
              <ul>
                <li><strong>Essential functionality:</strong> To keep you logged in and maintain your session</li>
                <li><strong>User preferences:</strong> To remember your settings and choices</li>
                <li><strong>Performance:</strong> To understand how the service is used and improve it</li>
                <li><strong>Security:</strong> To protect against fraud and unauthorized access</li>
              </ul>

              <h2>3. Types of Cookies We Use</h2>

              <h3>3.1 Essential Cookies (Always Active)</h3>
              <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4 not-prose">
                <p className="text-sm text-green-800">
                  <strong>Purpose:</strong> These cookies are necessary for the website to function properly
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Cookie Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">supabase-auth-token</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Keeps you logged in to your account</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Session</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">csrf-token</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Security protection against attacks</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Session</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">user-preferences</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Remembers your app settings</td>
                      <td className="px-4 py-3 text-sm text-gray-600">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>3.2 Functional Cookies (Optional)</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 not-prose">
                <p className="text-sm text-blue-800">
                  <strong>Purpose:</strong> Enhance your experience by remembering choices you make
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Cookie Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">ui-preferences</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Remembers dashboard layout and preferences</td>
                      <td className="px-4 py-3 text-sm text-gray-600">6 months</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">onboarding-complete</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Tracks completion of tutorial/onboarding</td>
                      <td className="px-4 py-3 text-sm text-gray-600">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>3.3 Analytics Cookies (Optional)</h3>
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4 mb-4 not-prose">
                <p className="text-sm text-purple-800">
                  <strong>Purpose:</strong> Help us understand how users interact with our service
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Service</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Purpose</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Data Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Google Analytics 4</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Website usage analytics and user behavior insights</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Page views, events, user interactions, educational progress (anonymized)</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm text-gray-900">Vercel Analytics</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Performance monitoring and usage statistics</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Page views, performance metrics (anonymized)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3>3.4 Marketing Cookies (Optional)</h3>
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 mb-4 not-prose">
                <p className="text-sm text-orange-800">
                  <strong>Purpose:</strong> Provide personalized educational content and resources
                </p>
                <p className="text-sm text-orange-800 mt-1">
                  <strong>Note:</strong> We do not use these for traditional advertising
                </p>
              </div>

              <p>
                These cookies help us provide relevant educational content and resources based on your interests. 
                They may be used to:
              </p>
              <ul>
                <li>Suggest relevant GCSE Geography resources</li>
                <li>Personalize educational content recommendations</li>
                <li>Provide targeted help and support materials</li>
              </ul>

              <h2>4. Third-Party Cookies</h2>
              <p>
                Some cookies are set by third-party services we use to provide our service:
              </p>

              <h3>4.1 Authentication Services</h3>
              <ul>
                <li><strong>Google OAuth:</strong> When you sign in with Google</li>
                <li><strong>Microsoft OAuth:</strong> When you sign in with Microsoft</li>
              </ul>

              <h3>4.2 Payment Processing</h3>
              <ul>
                <li><strong>Stripe:</strong> For secure payment processing and fraud prevention</li>
              </ul>

              <h3>4.3 Analytics Services</h3>
              <ul>
                <li><strong>Google Analytics 4:</strong> For website analytics and user behavior insights (with consent)</li>
                <li><strong>Vercel Analytics:</strong> For performance monitoring and optimization</li>
              </ul>

              <h3>4.4 Performance and Security</h3>
              <ul>
                <li><strong>Vercel:</strong> For website hosting and performance optimization</li>
                <li><strong>Supabase:</strong> For secure data storage and authentication</li>
              </ul>

              <h2>5. Managing Your Cookie Preferences</h2>
              
              <h3>5.1 Using Our Cookie Preference Center</h3>
              <p>
                You can manage your cookie preferences using the preference center at the top of this page. 
                Your choices will be saved and applied across your visits.
              </p>

              <h3>5.2 Browser Settings</h3>
              <p>
                You can also control cookies through your browser settings:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Chrome</h4>
                  <p className="text-sm text-gray-700">
                    Settings → Privacy and security → Cookies and other site data
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Firefox</h4>
                  <p className="text-sm text-gray-700">
                    Preferences → Privacy & Security → Cookies and Site Data
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Safari</h4>
                  <p className="text-sm text-gray-700">
                    Preferences → Privacy → Manage Website Data
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Edge</h4>
                  <p className="text-sm text-gray-700">
                    Settings → Site permissions → Cookies and site data
                  </p>
                </div>
              </div>

              <h3>5.3 Impact of Disabling Cookies</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 not-prose">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Disabling essential cookies will prevent you from using core features 
                  of Riverwalks, including logging in and saving your work.
                </p>
              </div>

              <h2>6. Student Privacy and Educational Use</h2>
              <p>
                We take student privacy seriously and ensure that our use of cookies complies with 
                educational privacy requirements:
              </p>
              <ul>
                <li>No behavioral tracking of students for advertising purposes</li>
                <li>Analytics data is anonymized and used only for service improvement</li>
                <li>Teachers and schools can manage cookie settings for their students</li>
                <li>Parental consent processes include cookie usage information</li>
              </ul>

              <h2>7. Data Retention</h2>
              <p>
                Different types of cookies are retained for different periods:
              </p>
              <ul>
                <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
                <li><strong>Persistent cookies:</strong> Stored until their expiration date or until you delete them</li>
                <li><strong>Google Analytics data:</strong> Anonymized and retained for up to 26 months, then automatically deleted</li>
                <li><strong>Vercel Analytics data:</strong> Retained according to Vercel's data retention policy</li>
                <li><strong>Preference cookies:</strong> Retained until you change your settings or clear browser data</li>
              </ul>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4 not-prose">
                <h4 className="font-semibold text-blue-900 mb-2">Your Data Rights</h4>
                <p className="text-sm text-blue-800">
                  You have the right to access, rectify, or delete your personal data, including analytics data. 
                  You can also withdraw consent for optional cookies at any time by updating your preferences above 
                  or contacting us directly.
                </p>
              </div>

              <h2>8. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time. When we make significant changes, 
                we will notify you through:
              </p>
              <ul>
                <li>A notice on our website</li>
                <li>Email notification (for registered users)</li>
                <li>Update to the &quot;Last updated&quot; date at the top of this policy</li>
              </ul>

              <h2>9. Contact Us</h2>
              <p>
                If you have questions about our use of cookies, please contact us:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 not-prose">
                <p className="text-sm text-gray-700">
                  <strong>Email:</strong> privacy@riverwalks.co.uk<br />
                  <strong>Subject:</strong> Cookie Policy Question<br />
                  <strong>Website:</strong> <Link href="/" className="text-primary hover:underline">riverwalks.co.uk</Link>
                </p>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="border-t pt-8 mt-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <Link href="/terms" className="hover:text-primary transition-colors">
                    Terms of Service
                  </Link>
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
                  </Link>
                  <Link href="/" className="hover:text-primary transition-colors">
                    Back to App
                  </Link>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {new Date().toLocaleDateString('en-GB')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}