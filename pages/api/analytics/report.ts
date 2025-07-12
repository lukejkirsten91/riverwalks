import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';

// This would integrate with Google Analytics Reporting API
// For now, using mock data structure

interface AnalyticsReport {
  period: string;
  totalUsers: number;
  newUsers: number;
  pageViews: number;
  conversionRate: number;
  revenue: number;
  topEvents: Array<{ event: string; count: number }>;
  topPages: Array<{ page: string; views: number }>;
  insights: string[];
}

const generateReport = async (period: '7d' | '30d'): Promise<AnalyticsReport> => {
  // In a real implementation, this would query Google Analytics API
  // Example: https://developers.google.com/analytics/devguides/reporting/data/v1
  
  const mockData: AnalyticsReport = {
    period: period === '7d' ? 'Last 7 Days' : 'Last 30 Days',
    totalUsers: period === '7d' ? 1243 : 4821,
    newUsers: period === '7d' ? 156 : 892,
    pageViews: period === '7d' ? 4521 : 18942,
    conversionRate: period === '7d' ? 2.4 : 2.8,
    revenue: period === '7d' ? 45.50 : 234.80,
    topEvents: [
      { event: 'sign_up', count: period === '7d' ? 23 : 89 },
      { event: 'report_generated', count: period === '7d' ? 67 : 234 },
      { event: 'upgrade_prompt_shown', count: period === '7d' ? 145 : 567 },
      { event: 'purchase', count: period === '7d' ? 12 : 45 }
    ],
    topPages: [
      { page: '/', views: period === '7d' ? 1234 : 4567 },
      { page: '/river-walks', views: period === '7d' ? 892 : 3234 },
      { page: '/subscription', views: period === '7d' ? 234 : 892 },
      { page: '/privacy', views: period === '7d' ? 123 : 456 }
    ],
    insights: [
      `📈 **Conversion Rate**: ${period === '7d' ? '2.4%' : '2.8%'} - ${period === '7d' ? 'Consider A/B testing your upgrade prompts to improve conversion' : 'Great job! Your conversion rate is above the 2.2% education industry average'}`,
      `📚 **Feature Usage**: Report generation is your most popular feature with ${period === '7d' ? '67' : '234'} uses - consider promoting this in onboarding`,
      `👥 **User Growth**: ${period === '7d' ? '156' : '892'} new users this period - ${period === '7d' ? 'steady growth, consider referral incentives' : 'excellent acquisition rate'}`,
      `💰 **Revenue**: £${period === '7d' ? '45.50' : '234.80'} generated - ${period === '7d' ? 'on track for £300+ monthly recurring revenue' : 'strong momentum toward £1000+ MRR'}`,
      `🎯 **Recommendations**: ${period === '7d' ? 'Focus on converting free users with targeted educational content and trial extensions' : 'Scale up marketing efforts and consider adding team/school pricing tiers'}`,
      `📊 **Next Actions**: ${period === '7d' ? 'Analyze user drop-off points and add more guided tutorials' : 'Implement user feedback system and advanced analytics features'}`
    ]
  };
  
  return mockData;
};

const formatEmailReport = (report: AnalyticsReport): string => {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .metric { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
          .metric-value { font-size: 24px; font-weight: bold; color: #667eea; }
          .table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .table th, .table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .table th { background-color: #f8f9fa; }
          .insights { background: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌊 Riverwalks Analytics Report</h1>
          <p>${report.period} Performance Summary</p>
        </div>
        
        <div class="content">
          <h2>📊 Key Metrics</h2>
          
          <div class="metric">
            <div>Total Users</div>
            <div class="metric-value">${report.totalUsers.toLocaleString()}</div>
          </div>
          
          <div class="metric">
            <div>New Users</div>
            <div class="metric-value">${report.newUsers.toLocaleString()}</div>
          </div>
          
          <div class="metric">
            <div>Page Views</div>
            <div class="metric-value">${report.pageViews.toLocaleString()}</div>
          </div>
          
          <div class="metric">
            <div>Conversion Rate</div>
            <div class="metric-value">${report.conversionRate}%</div>
          </div>
          
          <div class="metric">
            <div>Revenue</div>
            <div class="metric-value">£${report.revenue}</div>
          </div>

          <h2>🔥 Top Events</h2>
          <table class="table">
            <thead>
              <tr><th>Event</th><th>Count</th></tr>
            </thead>
            <tbody>
              ${report.topEvents.map(event => 
                `<tr><td>${event.event}</td><td>${event.count}</td></tr>`
              ).join('')}
            </tbody>
          </table>

          <h2>📄 Top Pages</h2>
          <table class="table">
            <thead>
              <tr><th>Page</th><th>Views</th></tr>
            </thead>
            <tbody>
              ${report.topPages.map(page => 
                `<tr><td>${page.page}</td><td>${page.views.toLocaleString()}</td></tr>`
              ).join('')}
            </tbody>
          </table>

          <h2>💡 Key Insights & Recommendations</h2>
          <div class="insights">
            <ul>
              ${report.insights.map(insight => `<li>${insight}</li>`).join('')}
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>Generated by Riverwalks Analytics • ${new Date().toLocaleDateString()}</p>
          <p>This is an automated report. Visit your dashboard for real-time data.</p>
        </div>
      </body>
    </html>
  `;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { period = '7d', email, type = 'manual' } = req.body;

    // Validate inputs
    if (!['7d', '30d'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period. Use 7d or 30d' });
    }

    if (!email && type === 'manual') {
      return res.status(400).json({ error: 'Email is required for manual reports' });
    }

    // Generate report
    const report = await generateReport(period);

    // For automated reports, use admin email
    const recipientEmail = email || process.env.ADMIN_EMAIL || 'admin@riverwalks.co.uk';

    // Send email (in production, you'd configure this properly)
    const transporter = nodemailer.createTransport({
      // Configure your email service here
      // For example, Gmail, SendGrid, etc.
      host: process.env.SMTP_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'analytics@riverwalks.co.uk',
      to: recipientEmail,
      subject: `Riverwalks Analytics Report - ${report.period}`,
      html: formatEmailReport(report),
    };

    // In development, just log the report instead of sending email
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Report (Development Mode):');
      console.log('To:', recipientEmail);
      console.log('Subject:', mailOptions.subject);
      console.log('Report Data:', JSON.stringify(report, null, 2));
      
      return res.status(200).json({ 
        success: true, 
        message: 'Report generated (development mode - check console)',
        report 
      });
    }

    // Send email in production
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Analytics report sent to ${recipientEmail}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return res.status(500).json({ error: 'Failed to send email report' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Analytics report sent to ${recipientEmail}`,
      report 
    });

  } catch (error) {
    console.error('Analytics report generation failed:', error);
    res.status(500).json({ error: 'Failed to generate analytics report' });
  }
}

// Helper function for scheduled reports (could be called by a cron job)
export const sendScheduledReport = async (period: '7d' | '30d') => {
  try {
    const response = await fetch('/api/analytics/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, type: 'scheduled' })
    });
    
    const result = await response.json();
    console.log('Scheduled report result:', result);
    return result;
  } catch (error) {
    console.error('Scheduled report failed:', error);
    throw error;
  }
};