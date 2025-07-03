import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Database, Mail, Cookie } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy - Riverwalks</title>
        <meta name="description" content="Privacy Policy for Riverwalks - GDPR compliant data protection for GCSE Geography students" />
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
                <Shield className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Privacy Policy</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-modern p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* GDPR Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">GDPR Compliance & Student Privacy</h3>
                  <p className="text-sm text-green-800">
                    We are committed to protecting student privacy and comply with GDPR, COPPA, and UK data protection laws. 
                    This policy explains how we collect, use, and protect your personal information.
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy Content */}
            <div className="prose prose-gray max-w-none">
              <h2>1. Who We Are</h2>
              <p>
                Riverwalks (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is an educational technology service designed for GCSE Geography 
                students and educators. We operate under UK data protection laws and are committed to protecting your privacy.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 not-prose mb-6">
                <p className="text-sm text-gray-700">
                  <strong>Data Controller:</strong> Riverwalks<br />
                  <strong>Contact:</strong> privacy@riverwalks.co.uk<br />
                  <strong>Website:</strong> <Link href="/" className="text-primary hover:underline">riverwalks.co.uk</Link>
                </p>
              </div>

              <h2>2. Information We Collect</h2>
              
              <h3>2.1 Account Information</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 not-prose">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>What we collect:</strong> Email address, name (from Google/Microsoft OAuth), profile picture (optional)
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Why:</strong> To create and manage your account, provide personalized experience
                    </p>
                  </div>
                </div>
              </div>

              <h3>2.2 Educational Data</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 not-prose">
                <div className="flex items-start gap-3">
                  <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>What we collect:</strong> River walk data, site measurements, photos, field notes, coordinates
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Why:</strong> To provide the core educational service, generate reports, store your coursework
                    </p>
                  </div>
                </div>
              </div>

              <h3>2.3 Usage Information</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 not-prose">
                <div className="flex items-start gap-3">
                  <Cookie className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>What we collect:</strong> How you use the service, error logs, performance data
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Why:</strong> To improve the service, fix bugs, ensure security
                    </p>
                  </div>
                </div>
              </div>

              <h3>2.4 Subscription and Payment Information</h3>
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 not-prose">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800">
                      <strong>What we collect:</strong> Subscription status, billing email, customer reference ID (from Stripe)
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Payment data:</strong> Credit/debit card details are processed and stored securely by Stripe (PCI DSS Level 1 compliant). We never see or store your full payment details.
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      <strong>Why:</strong> To manage your subscription, process payments, provide customer support, and comply with financial regulations
                    </p>
                  </div>
                </div>
              </div>
              
              <h4>Payment Data Processing:</h4>
              <ul>
                <li><strong>Stripe (Payment Processor):</strong> Handles all payment card data with bank-level security</li>
                <li><strong>Subscription Records:</strong> We store subscription status, type (annual/lifetime), and billing dates</li>
                <li><strong>Billing History:</strong> Transaction records for invoicing and customer support</li>
                <li><strong>Refund Processing:</strong> Limited data retention for refund and dispute resolution</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              
              <h3>3.1 Core Service Provision</h3>
              <ul>
                <li>Creating and managing your account (free for all users)</li>
                <li>Storing and organizing your educational data</li>
                <li>Basic river walk and site management tools</li>
                <li>Premium features for subscribers: professional reports, data export, collaboration</li>
                <li>Processing subscription payments and managing billing</li>
                <li>Providing customer support for both free and premium users</li>
              </ul>

              <h3>3.2 Communication</h3>
              <ul>
                <li>Service updates and important notifications</li>
                <li>Educational content and tips (opt-in only)</li>
                <li>Customer support responses</li>
                <li>Billing and subscription information</li>
              </ul>

              <h3>3.3 Service Improvement</h3>
              <ul>
                <li>Analyzing usage patterns to improve functionality</li>
                <li>Identifying and fixing technical issues</li>
                <li>Developing new educational features</li>
                <li>Ensuring security and preventing abuse</li>
              </ul>

              <h2>4. Legal Basis for Processing (GDPR)</h2>
              <p>Under GDPR, we process your personal data based on:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Contract Performance</h4>
                  <p className="text-sm text-gray-700">
                    Processing necessary to provide the educational service you&apos;ve subscribed to
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Legitimate Interest</h4>
                  <p className="text-sm text-gray-700">
                    Improving our service, security monitoring, and customer support
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Consent</h4>
                  <p className="text-sm text-gray-700">
                    Marketing communications and optional features (you can withdraw anytime)
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Legal Compliance</h4>
                  <p className="text-sm text-gray-700">
                    Meeting tax obligations, responding to legal requests
                  </p>
                </div>
              </div>

              <h2>5. Information Sharing</h2>
              
              <h3>5.1 We DO NOT Sell Your Data</h3>
              <p>
                We never sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>

              <h3>5.2 Limited Sharing</h3>
              <p>We may share information only in these specific circumstances:</p>
              <ul>
                <li><strong>Service Providers:</strong> Trusted partners who help us operate the service (hosting, payment processing, email)</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or to protect safety</li>
                <li><strong>Business Transfer:</strong> In the unlikely event of a business sale or merger (with user notification)</li>
                <li><strong>Collaboration Features:</strong> With other users when you explicitly choose to share data (teachers/students)</li>
              </ul>

              <h3>5.3 Third-Party Services</h3>
              <ul>
                <li><strong>Supabase:</strong> Database and authentication hosting (EU-based servers)</li>
                <li><strong>Vercel:</strong> Website hosting and performance</li>
                <li><strong>Stripe:</strong> Payment processing (PCI DSS compliant)</li>
                <li><strong>Google/Microsoft:</strong> Authentication services (OAuth only)</li>
              </ul>

              <h2>6. Data Storage and Security</h2>
              
              <h3>6.1 Where Your Data is Stored</h3>
              <p>
                Your data is stored on secure servers within the European Union to ensure GDPR compliance. 
                We use industry-standard security measures including encryption, access controls, and regular backups.
              </p>

              <h3>6.2 Security Measures</h3>
              <ul>
                <li>End-to-end encryption for data transmission</li>
                <li>Encrypted database storage</li>
                <li>Multi-factor authentication for admin access</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and user permission systems</li>
              </ul>

              <h3>6.3 Data Retention</h3>
              <ul>
                <li><strong>Active accounts:</strong> Personal and educational data retained while account is active</li>
                <li><strong>Cancelled accounts:</strong> Account data retained for 30 days then deleted (allows account recovery)</li>
                <li><strong>Payment records:</strong> Billing and subscription data retained for 7 years (UK tax law requirement)</li>
                <li><strong>Legal compliance:</strong> Some data may be retained longer to comply with financial regulations</li>
                <li><strong>System backups:</strong> Automated deletion from backups within 90 days</li>
                <li><strong>Fraud prevention:</strong> Minimal data may be retained longer to prevent payment fraud</li>
              </ul>

              <h2>7. Your Rights (GDPR)</h2>
              <p>Under GDPR and UK data protection laws, you have the following rights:</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6 not-prose">
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Access</h4>
                  <p className="text-sm text-green-800">
                    Request a copy of all personal data we hold about you
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Rectification</h4>
                  <p className="text-sm text-green-800">
                    Correct any inaccurate or incomplete personal data
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Erasure</h4>
                  <p className="text-sm text-green-800">
                    Request deletion of your personal data (&quot;right to be forgotten&quot;)
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Portability</h4>
                  <p className="text-sm text-green-800">
                    Export your data in a machine-readable format
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Restriction</h4>
                  <p className="text-sm text-green-800">
                    Limit how we process your personal data
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2">Objection</h4>
                  <p className="text-sm text-green-800">
                    Object to processing based on legitimate interests
                  </p>
                </div>
              </div>

              <p>
                To exercise any of these rights, please contact us at privacy@riverwalks.co.uk. 
                We will respond within 30 days of receiving your request.
              </p>

              <h3>7.1 Payment Data Rights</h3>
              <p>
                <strong>Important:</strong> Some payment-related data may have limited deletion rights due to:
              </p>
              <ul>
                <li>UK tax law requirements (7-year retention for financial records)</li>
                <li>Anti-fraud and anti-money laundering regulations</li>
                <li>Stripe's own data retention policies for payment processing</li>
                <li>Legitimate business interests in maintaining billing history</li>
              </ul>
              <p>
                We will always delete the maximum amount of data legally permissible when you exercise your rights.
              </p>

              <h2>8. Children&apos;s Privacy (Under 18)</h2>
              
              <h3>8.1 Age Requirements</h3>
              <ul>
                <li><strong>13-18 years:</strong> Can use with parental awareness (recommended)</li>
                <li><strong>Under 13 years:</strong> Requires explicit parental consent (COPPA compliance)</li>
                <li><strong>School accounts:</strong> Educational institutions handle consent requirements</li>
              </ul>

              <h3>8.2 Additional Protections</h3>
              <ul>
                <li>No behavioral advertising to children</li>
                <li>Enhanced data protection measures</li>
                <li>Clear, age-appropriate privacy information</li>
                <li>Easy mechanisms for parents to access/delete child data</li>
              </ul>

              <h2>9. International Transfers</h2>
              <p>
                We primarily store data within the EU. If data needs to be transferred outside the EU, 
                we ensure adequate protection through:
              </p>
              <ul>
                <li>Adequacy decisions by the European Commission</li>
                <li>Standard Contractual Clauses (SCCs)</li>
                <li>Certification schemes and codes of conduct</li>
              </ul>

              <h2>10. Cookies and Tracking</h2>
              <p>
                We use cookies and similar technologies to improve your experience. For detailed information, 
                see our <Link href="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
              </p>

              <h3>10.1 Essential Cookies</h3>
              <ul>
                <li>Authentication and session management</li>
                <li>Security and fraud prevention</li>
                <li>Core functionality and preferences</li>
              </ul>

              <h3>10.2 Optional Cookies (with consent)</h3>
              <ul>
                <li>Analytics to understand usage patterns</li>
                <li>Performance monitoring and optimization</li>
                <li>User experience improvements</li>
              </ul>

              <h2>11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy to reflect changes in our practices or legal requirements. 
                Significant changes will be communicated via:
              </p>
              <ul>
                <li>Email notification to registered users</li>
                <li>Prominent notice on our website</li>
                <li>In-app notifications</li>
              </ul>
              <p>
                Continued use of the service after changes indicates acceptance of the updated policy.
              </p>

              <h2>12. Contact Us</h2>
              <p>
                For any privacy-related questions, concerns, or requests, please contact us:
              </p>

              <div className="bg-gray-50 rounded-lg p-4 not-prose">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Privacy Officer
                    </h4>
                    <p className="text-sm text-gray-700">
                      Email: privacy@riverwalks.co.uk<br />
                      Response time: Within 30 days
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Data Protection Authority</h4>
                    <p className="text-sm text-gray-700">
                      UK: Information Commissioner&apos;s Office (ICO)<br />
                      Website: ico.org.uk
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8 not-prose">
                <h4 className="font-semibold text-blue-900 mb-2">Educational Commitment</h4>
                <p className="text-sm text-blue-800">
                  Riverwalks is designed specifically for educational purposes. We are committed to maintaining 
                  the highest standards of privacy protection for students, educators, and educational institutions. 
                  We welcome feedback from the educational community to continuously improve our privacy practices.
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
                  <Link href="/cookies" className="hover:text-primary transition-colors">
                    Cookie Policy
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