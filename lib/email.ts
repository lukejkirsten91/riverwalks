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

// Reset password email template
const getResetPasswordEmailHtml = (confirmationUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Riverwalks Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🌊 Riverwalks</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Your river study platform</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 600;">Reset your password</h2>

            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                We received a request to reset your password for your Riverwalks account. Click the button below to create a new password. This link will expire in 1 hour for your security.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                    🔐 Reset Your Password
                </a>
            </div>

            <!-- Alternative Link -->
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #475569; font-size: 14px; font-weight: 500;">
                    Button not working? Copy and paste this link:
                </p>
                <p style="margin: 0; word-break: break-all; color: #3b82f6; font-size: 14px;">
                    ${confirmationUrl}
                </p>
            </div>

            <!-- Security Notice -->
            <div style="border-left: 4px solid #ef4444; background: #fef2f2; padding: 16px; border-radius: 0 6px 6px 0; margin: 24px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>🛡️ Security notice:</strong> This password reset was requested for your Riverwalks account. If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                </p>
            </div>

            <!-- Next Steps -->
            <div style="margin: 32px 0 0;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">After resetting your password:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                    <li>You'll be automatically signed in to your account</li>
                    <li>Continue working on your river studies</li>
                    <li>Access all your saved data and reports</li>
                    <li>Consider enabling two-factor authentication for extra security</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0 0 8px;">
                This email was sent by <strong>Riverwalks</strong> • The complete river study platform
            </p>
            <p style="margin: 0;">
                Questions? Email us at <a href="mailto:support@riverwalks.co.uk" style="color: #3b82f6; text-decoration: none;">support@riverwalks.co.uk</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// Invite email template
const getInviteEmailHtml = (siteUrl: string, confirmationUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>You're Invited to Riverwalks</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🌊 Riverwalks</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Your river study platform</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 600;">You have been invited</h2>

            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                You have been invited to create a user account on ${siteUrl}. Join the Riverwalks community and start your river study journey. Click the button below to accept the invite and create your account.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                    🎉 Accept the Invite
                </a>
            </div>

            <!-- Alternative Link -->
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #475569; font-size: 14px; font-weight: 500;">
                    Button not working? Copy and paste this link:
                </p>
                <p style="margin: 0; word-break: break-all; color: #3b82f6; font-size: 14px;">
                    ${confirmationUrl}
                </p>
            </div>

            <!-- Welcome Info -->
            <div style="border-left: 4px solid #10b981; background: #f0fdf4; padding: 16px; border-radius: 0 6px 6px 0; margin: 24px 0;">
                <p style="margin: 0; color: #065f46; font-size: 14px;">
                    <strong>🌊 Welcome to Riverwalks!</strong> You're joining a community of students, researchers, and river enthusiasts across the UK. Create professional field studies, generate beautiful reports, and explore waterways with confidence.
                </p>
            </div>

            <!-- What You'll Get -->
            <div style="margin: 32px 0 0;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">What you'll get access to:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                    <li>Interactive river study tools and GPS mapping</li>
                    <li>Professional PDF report generation</li>
                    <li>Data analysis and visualization features</li>
                    <li>Collaborative workspace for team projects</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0 0 8px;">
                This email was sent by <strong>Riverwalks</strong> • The complete river study platform
            </p>
            <p style="margin: 0;">
                Questions? Email us at <a href="mailto:support@riverwalks.co.uk" style="color: #3b82f6; text-decoration: none;">support@riverwalks.co.uk</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// Email change confirmation template
const getEmailChangeConfirmationHtml = (oldEmail: string, newEmail: string, confirmationUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Email Change - Riverwalks</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🌊 Riverwalks</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Your river study platform</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 600;">Confirm change of email</h2>

            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                Follow this link to confirm the update of your email from <strong>${oldEmail}</strong> to <strong>${newEmail}</strong>. This ensures your account remains secure and you continue to receive important updates.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 32px 0;">
                <a href="${confirmationUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);">
                    ✉️ Change Email
                </a>
            </div>

            <!-- Alternative Link -->
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0 0 8px; color: #475569; font-size: 14px; font-weight: 500;">
                    Button not working? Copy and paste this link:
                </p>
                <p style="margin: 0; word-break: break-all; color: #3b82f6; font-size: 14px;">
                    ${confirmationUrl}
                </p>
            </div>

            <!-- Security Notice -->
            <div style="border-left: 4px solid #f59e0b; background: #fffbeb; padding: 16px; border-radius: 0 6px 6px 0; margin: 24px 0;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>🔒 Security notice:</strong> If you didn't request this email change, please contact our support team immediately. This ensures your account remains secure.
                </p>
            </div>

            <!-- Email Change Details -->
            <div style="margin: 32px 0 0;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Email change details:</h3>
                <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #4b5563; font-size: 14px;">
                        <strong>From:</strong> ${oldEmail}
                    </p>
                    <p style="margin: 0; color: #4b5563; font-size: 14px;">
                        <strong>To:</strong> ${newEmail}
                    </p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0 0 8px;">
                This email was sent by <strong>Riverwalks</strong> • The complete river study platform
            </p>
            <p style="margin: 0;">
                Questions? Email us at <a href="mailto:support@riverwalks.co.uk" style="color: #3b82f6; text-decoration: none;">support@riverwalks.co.uk</a>
            </p>
        </div>
    </div>
</body>
</html>
`;

// Reauthentication code template
const getReauthenticationCodeHtml = (token: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Code - Riverwalks</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); color: white; padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">🌊 Riverwalks</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 16px;">Your river study platform</p>
        </div>

        <!-- Main Content -->
        <div style="background: white; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 22px; font-weight: 600;">Confirm reauthentication</h2>

            <p style="margin: 0 0 24px; color: #4b5563; font-size: 16px; line-height: 1.5;">
                For your security, we need to verify your identity. Enter the code below in your application to complete the reauthentication process.
            </p>

            <!-- Code Display -->
            <div style="text-align: center; margin: 32px 0;">
                <div style="display: inline-block; background: #f1f5f9; border: 2px solid #3b82f6; padding: 20px 30px; border-radius: 12px; font-family: 'Courier New', monospace;">
                    <p style="margin: 0; color: #1f2937; font-size: 24px; font-weight: bold; letter-spacing: 4px;">
                        ${token}
                    </p>
                </div>
            </div>

            <!-- Instructions -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 12px; color: #1e40af; font-size: 14px; font-weight: 600;">
                    📋 How to use this code:
                </p>
                <ol style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.6;">
                    <li>Copy the code above</li>
                    <li>Return to your Riverwalks application</li>
                    <li>Paste the code in the verification field</li>
                    <li>Click "Verify" to complete the process</li>
                </ol>
            </div>

            <!-- Security Notice -->
            <div style="border-left: 4px solid #ef4444; background: #fef2f2; padding: 16px; border-radius: 0 6px 6px 0; margin: 24px 0;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                    <strong>🛡️ Security reminder:</strong> This code will expire soon for your protection. Never share this code with anyone. Riverwalks will never ask for this code via email or phone.
                </p>
            </div>

            <!-- Code Details -->
            <div style="margin: 32px 0 0;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Code details:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.6;">
                    <li>This code is single-use only</li>
                    <li>It will expire in a few minutes</li>
                    <li>Use it only in the official Riverwalks application</li>
                    <li>Request a new code if this one expires</li>
                </ul>
            </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p style="margin: 0 0 8px;">
                This email was sent by <strong>Riverwalks</strong> • The complete river study platform
            </p>
            <p style="margin: 0;">
                Questions? Email us at <a href="mailto:support@riverwalks.co.uk" style="color: #3b82f6; text-decoration: none;">support@riverwalks.co.uk</a>
            </p>
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

// Export email template functions
export const getResetPasswordEmailTemplate = (confirmationUrl: string): string => {
  return getResetPasswordEmailHtml(confirmationUrl);
};

export const getInviteEmailTemplate = (siteUrl: string, confirmationUrl: string): string => {
  return getInviteEmailHtml(siteUrl, confirmationUrl);
};

export const getEmailChangeConfirmationTemplate = (oldEmail: string, newEmail: string, confirmationUrl: string): string => {
  return getEmailChangeConfirmationHtml(oldEmail, newEmail, confirmationUrl);
};

export const getReauthenticationCodeTemplate = (token: string): string => {
  return getReauthenticationCodeHtml(token);
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