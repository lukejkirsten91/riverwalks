import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER, // Your email address
    pass: process.env.SMTP_PASS, // Your email password or app password
  },
};

// Create transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('SMTP credentials not configured - email sending disabled');
    return null;
  }
  
  return nodemailer.createTransport(emailConfig);
};

// Welcome email template
const getWelcomeEmailHtml = (userEmail: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Riverwalks</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
        .logo { width: 48px; height: 48px; margin: 0 auto 16px; }
        .content { padding: 40px 30px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .step { background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6; }
        .step-number { background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; margin-right: 12px; line-height: 1; vertical-align: top; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🌊</div>
            <h1 style="margin: 0; font-size: 28px;">Welcome to Riverwalks!</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Turn your river adventures into beautiful data stories</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1e40af; margin-top: 0;">You're all set to explore UK rivers! 🎉</h2>
            
            <p>Hi there!</p>
            
            <p>Welcome to the Riverwalks community! Whether you're working on GCSE Geography coursework, researching waterways, or just curious about rivers, you're now part of a growing community of river enthusiasts across the UK.</p>
            
            <a href="https://www.riverwalks.co.uk/river-walks" class="button">Start Your First River Study →</a>
            
            <h3 style="color: #1e40af; margin-top: 32px;">Getting Started in 3 Easy Steps:</h3>
            
            <div class="step">
                <span class="step-number">1</span>
                <strong>Create Your First River Walk</strong><br>
                Click "Start Your First River Study" above or visit your dashboard to begin. Choose a river location and start recording measurements.
            </div>
            
            <div class="step">
                <span class="step-number">2</span>
                <strong>Record Field Data</strong><br>
                Add measurement sites with GPS coordinates, record depth readings, velocity, sediment analysis, and water quality data. Our interactive tools make it easy!
            </div>
            
            <div class="step">
                <span class="step-number">3</span>
                <strong>Generate Beautiful Reports</strong><br>
                Transform your data into professional cross-sections, 3D river profiles, and comprehensive analysis reports perfect for coursework or research.
            </div>
            
            <h3 style="color: #1e40af; margin-top: 32px;">💡 Quick Tips:</h3>
            <ul style="color: #4b5563;">
                <li><strong>Test All Features Free:</strong> Explore everything with no limitations during your trial</li>
                <li><strong>GPS Precision:</strong> Enable location services for accurate site mapping</li>
                <li><strong>Data Export:</strong> Download your data as CSV, PDF reports, or interactive charts</li>
                <li><strong>Community Data:</strong> See what other students are discovering across the UK</li>
            </ul>
            
            <h3 style="color: #1e40af;">Need Help?</h3>
            <p>If you have any questions or need assistance getting started, just reply to this email. We're here to help make your river studies successful!</p>
            
            <p>Happy exploring!</p>
            <p><strong>The Riverwalks Team</strong> 🌊</p>
        </div>
        
        <div class="footer">
            <p>© 2025 Riverwalks. All rights reserved.</p>
            <p style="margin: 8px 0 0;">This email was sent to ${userEmail} because you created a Riverwalks account.</p>
        </div>
    </div>
</body>
</html>
`;

// Plain text version for accessibility
const getWelcomeEmailText = (userEmail: string) => `
Welcome to Riverwalks! 🌊

Hi there!

Welcome to the Riverwalks community! Whether you're working on GCSE Geography coursework, researching waterways, or just curious about rivers, you're now part of a growing community of river enthusiasts across the UK.

Getting Started in 3 Easy Steps:

1. Create Your First River Walk
   Visit https://riverwalks.vercel.app/river-walks to begin. Choose a river location and start recording measurements.

2. Record Field Data
   Add measurement sites with GPS coordinates, record depth readings, velocity, sediment analysis, and water quality data.

3. Generate Beautiful Reports
   Transform your data into professional cross-sections, 3D river profiles, and comprehensive analysis reports.

Quick Tips:
• Test All Features Free: Explore everything with no limitations during your trial
• GPS Precision: Enable location services for accurate site mapping  
• Data Export: Download your data as CSV, PDF reports, or interactive charts
• Community Data: See what other students are discovering across the UK

Need Help?
If you have any questions or need assistance getting started, just reply to this email. We're here to help make your river studies successful!

Happy exploring!
The Riverwalks Team 🌊

---
© 2025 Riverwalks. All rights reserved.
This email was sent to ${userEmail} because you created a Riverwalks account.
`;

// Send welcome email
export const sendWelcomeEmail = async (userEmail: string): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      console.warn('Email transporter not configured - skipping welcome email');
      return false;
    }

    const mailOptions = {
      from: `"Riverwalks" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: '🌊 Welcome to Riverwalks - Start Your River Study Journey!',
      text: getWelcomeEmailText(userEmail),
      html: getWelcomeEmailHtml(userEmail),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
};

// Test email configuration
export const testEmailConfiguration = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return false;
    }

    await transporter.verify();
    console.log('✅ Email configuration is valid');
    return true;
    
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
};