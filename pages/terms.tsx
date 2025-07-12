import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, FileText, Scale, Shield } from 'lucide-react';

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service - Riverwalks</title>
        <meta name="description" content="Terms of Service for Riverwalks - GCSE Geography fieldwork application" />
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
                <Scale className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold text-foreground">Terms of Service</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-modern p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
                <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-GB')}</p>
              </div>
            </div>

            {/* Legal Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Educational Use Agreement</h3>
                  <p className="text-sm text-blue-800">
                    Riverwalks is designed specifically for educational purposes, particularly GCSE Geography fieldwork. 
                    By using this service, you agree to these terms and our commitment to student safety and data protection.
                  </p>
                </div>
              </div>
            </div>

            {/* Terms Content */}
            <div className="prose prose-gray max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Riverwalks (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). 
                If you disagree with any part of these terms, you may not access the Service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Riverwalks is a web-based application designed to help GCSE Geography students and educators document 
                river studies and generate professional coursework reports. The Service includes:
              </p>
              <ul>
                <li>River walk data collection and management</li>
                <li>Site measurement recording and analysis</li>
                <li>Professional report generation with charts and analysis</li>
                <li>Data export capabilities for further analysis</li>
                <li>Cloud storage for educational data</li>
              </ul>

              <h2>3. User Accounts and Age Requirements</h2>
              <h3>3.1 Account Creation</h3>
              <p>
                You must provide accurate, current, and complete information during registration. 
                You are responsible for safeguarding your account credentials.
              </p>
              
              <h3>3.2 Age Requirements</h3>
              <p>
                Users must be at least 13 years old. Users under 18 should have parental or guardian consent. 
                For users under 13, parental consent and supervision are required in accordance with COPPA regulations.
              </p>

              <h3>3.3 Educational Accounts</h3>
              <p>
                Teachers and educational institutions may create accounts to supervise student use. 
                Schools are responsible for obtaining appropriate consents and ensuring compliance with local regulations.
              </p>

              <h2>4. Acceptable Use</h2>
              <h3>4.1 Educational Purpose</h3>
              <p>The Service is intended solely for educational use. You agree to:</p>
              <ul>
                <li>Use the Service for legitimate educational fieldwork and research</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Not upload harmful, offensive, or inappropriate content</li>
                <li>Follow safety guidelines during fieldwork activities</li>
              </ul>

              <h3>4.2 Prohibited Activities</h3>
              <p>You may not:</p>
              <ul>
                <li>Use the Service for commercial purposes without authorization</li>
                <li>Attempt to reverse engineer or access unauthorized areas</li>
                <li>Share accounts or credentials with unauthorized users</li>
                <li>Upload personal information of others without consent</li>
                <li>Interfere with the Service&apos;s security or functionality</li>
              </ul>

              <h2>5. Safety and Fieldwork Responsibilities</h2>
              <h3>5.1 User Responsibility</h3>
              <p>
                While using Riverwalks for fieldwork, users are responsible for their own safety and the safety of others. 
                Always follow proper safety protocols when conducting river studies.
              </p>

              <h3>5.2 Limitation of Liability</h3>
              <p>
                Riverwalks is not responsible for accidents, injuries, or incidents that occur during fieldwork activities. 
                Users participate in fieldwork at their own risk and should follow appropriate safety guidelines.
              </p>

              <h2>6. Data and Privacy</h2>
              <p>
                Your privacy is important to us. Our collection, use, and protection of your data is governed by our 
                <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, 
                which is incorporated into these Terms by reference.
              </p>

              <h2>7. Subscription and Payment Terms</h2>
              <h3>7.1 Freemium Service Model</h3>
              <p>
                Riverwalks operates on a freemium model. Basic features (creating and managing river walks) are free. 
                Premium features require a paid subscription:
              </p>
              <ul>
                <li><strong>Annual Subscription:</strong> £1.99 per year</li>
                <li><strong>Lifetime Access:</strong> £3.49 one-time payment</li>
              </ul>

              <h3>7.2 Free Features</h3>
              <p>
                All users can access basic river walk creation, site management, and data collection tools at no cost. 
                No credit card required for basic functionality.
              </p>

              <h3>7.3 Premium Features</h3>
              <p>
                Premium subscriptions unlock advanced features including:
              </p>
              <ul>
                <li>Professional PDF report generation with charts and analysis</li>
                <li>Excel data export for statistical analysis</li>
                <li>River walk sharing and collaboration</li>
                <li>Advanced data visualization tools</li>
              </ul>

              <h3>7.4 Payment Processing</h3>
              <p>
                Payments are processed securely through Stripe. We comply with PCI DSS standards and do not store 
                payment card information on our servers. By making a payment, you agree to Stripe's Terms of Service.
              </p>

              <h3>7.5 Refund Policy</h3>
              <p>
                Due to the digital nature and low cost of our service, we generally do not offer refunds. However, 
                we will consider refund requests within 14 days of purchase for exceptional circumstances such as:
              </p>
              <ul>
                <li>Technical issues preventing service access</li>
                <li>Accidental duplicate purchases</li>
                <li>Service not meeting educational requirements</li>
              </ul>
              <p>
                To request a refund, contact support@riverwalks.co.uk with your payment details and reason for the request.
              </p>

              <h3>7.6 Subscription Management</h3>
              <p>
                Annual subscriptions automatically renew unless cancelled. You can manage your subscription status 
                in your account settings. Lifetime subscriptions do not require renewal. Access to premium features 
                continues until subscription expiry or cancellation.
              </p>

              <h3>7.7 Price Changes</h3>
              <p>
                We reserve the right to modify subscription prices with 30 days notice to existing subscribers. 
                Price changes do not affect active subscription periods paid in advance.
              </p>

              <h2>8. Data Processing and GDPR Compliance</h2>
              <h3>8.1 Data Controller</h3>
              <p>
                Riverwalks acts as the data controller for personal data collected through the Service. 
                We process data in accordance with UK GDPR and Data Protection Act 2018.
              </p>

              <h3>8.2 Lawful Basis for Processing</h3>
              <p>
                We process personal data on the following lawful bases:
              </p>
              <ul>
                <li><strong>Consent:</strong> For optional analytics cookies, marketing communications, and Google Analytics 4 data collection</li>
                <li><strong>Contract:</strong> To provide the Service and process payments</li>
                <li><strong>Legitimate Interest:</strong> For service improvement, fraud prevention, and essential performance monitoring</li>
              </ul>

              <h3>8.3 Analytics and Usage Data</h3>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 not-prose">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>Analytics Collection:</strong> With your consent, we use Google Analytics 4 to collect:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 mb-2">
                  <li>• Website usage patterns and navigation behavior</li>
                  <li>• Educational feature usage and learning progress</li>
                  <li>• User interactions, button clicks, and form submissions</li>
                  <li>• Subscription conversions and upgrade interactions</li>
                  <li>• File downloads and report generation events</li>
                </ul>
                <p className="text-sm text-yellow-800">
                  This data is anonymized, used solely for service improvement, and you can opt-out at any time 
                  through our cookie preferences.
                </p>
              </div>

              <h3>8.4 Your Rights</h3>
              <p>
                Under UK GDPR, you have the right to:
              </p>
              <ul>
                <li>Access your personal data (data portability)</li>
                <li>Rectify inaccurate personal data</li>
                <li>Erase your personal data (right to be forgotten)</li>
                <li>Restrict processing of your personal data</li>
                <li>Object to processing based on legitimate interests</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p>
                To exercise these rights, contact us at support@riverwalks.co.uk. We will respond within one month.
              </p>

              <h3>8.5 Data Retention</h3>
              <p>
                We retain personal data for as long as necessary to provide the Service and comply with legal obligations. 
                Account data is retained for 30 days after account deletion to allow for recovery. Payment data is retained 
                as required by financial regulations (typically 7 years). Analytics data is anonymized and retained for up to 
                26 months, after which it is automatically deleted.
              </p>

              <h3>8.6 International Transfers</h3>
              <p>
                Our service providers (including Supabase, Stripe, and Google Analytics) may process data outside the UK. We ensure adequate 
                protections are in place through appropriate safeguards such as adequacy decisions or standard contractual clauses.
              </p>

              <h2>9. Intellectual Property</h2>
              <h3>9.1 Service Content</h3>
              <p>
                The Service, including its design, functionality, and content, is owned by Riverwalks and protected by 
                intellectual property laws.
              </p>

              <h3>9.2 User Content</h3>
              <p>
                You retain ownership of data you input into the Service. By using the Service, you grant us a license to 
                store, process, and display your content solely for providing the Service to you.
              </p>

              <h3>9.3 Educational Use License</h3>
              <p>
                We grant you a non-exclusive, non-transferable license to use the Service for educational purposes in 
                accordance with these Terms.
              </p>

              <h2>10. Service Availability</h2>
              <h3>10.1 Uptime</h3>
              <p>
                We strive to maintain high availability but cannot guarantee 100% uptime. The Service may be temporarily 
                unavailable for maintenance or technical issues.
              </p>

              <h3>10.2 Data Backup</h3>
              <p>
                While we implement backup procedures, users are encouraged to export important data regularly. 
                We are not liable for data loss due to technical failures.
              </p>

              <h2>11. Modifications and Termination</h2>
              <h3>11.1 Terms Modifications</h3>
              <p>
                We may modify these Terms at any time. Significant changes will be communicated via email or Service notification. 
                Continued use constitutes acceptance of modified Terms.
              </p>

              <h3>11.2 Service Modifications</h3>
              <p>
                We may modify, suspend, or discontinue features at any time. We will provide reasonable notice for 
                significant changes affecting functionality.
              </p>

              <h3>11.3 Account Termination</h3>
              <p>
                We may terminate accounts for violation of these Terms. Users may terminate their accounts at any time 
                through account settings.
              </p>

              <h2>12. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Riverwalks shall not be liable for any indirect, incidental, 
                special, or consequential damages arising from use of the Service. Our total liability shall not exceed 
                the amount paid for the Service in the 12 months preceding the claim.
              </p>

              <h2>13. Governing Law</h2>
              <p>
                These Terms are governed by the laws of England and Wales. Any disputes will be resolved in the courts 
                of England and Wales.
              </p>

              <h2>14. Contact Information</h2>
              <p>
                For questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-50 rounded-lg p-4 not-prose">
                <p className="text-sm text-gray-700">
                  <strong>Riverwalks Support</strong><br />
                  Email: support@riverwalks.co.uk<br />
                  Website: <Link href="/" className="text-primary hover:underline">riverwalks.co.uk</Link>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8 not-prose">
                <p className="text-sm text-blue-800">
                  <strong>Educational Support:</strong> Riverwalks is committed to supporting GCSE Geography education. 
                  We welcome feedback from educators and students to improve our service for the educational community.
                </p>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="border-t pt-8 mt-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <Link href="/privacy" className="hover:text-primary transition-colors">
                    Privacy Policy
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