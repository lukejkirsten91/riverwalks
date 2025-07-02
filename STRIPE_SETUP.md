# Stripe Payment System Setup Guide

Complete guide for implementing Stripe payments in Riverwalks with voucher system, GDPR compliance, and subscription management.

## 🎯 Overview

This setup implements:
- **Two subscription plans**: £1.99/year and £3.50 lifetime
- **Voucher system**: Discounts up to 100% with admin management
- **GDPR compliance**: Data export, account deletion, user rights
- **Legal transparency**: Clear terms, easy cancellation, refund policies
- **Security**: PCI compliance through Stripe, secure data handling

## 🚀 1. Stripe Account Setup

### Create Stripe Account

1. **Sign up for Stripe** at https://stripe.com
2. Choose **United Kingdom** as your country
3. Complete business verification with:
   - Business details (sole trader or limited company)
   - Bank account details for payouts
   - ID verification documents

### Configure Tax Settings

1. Navigate to **Settings → Tax**
2. Enable **UK VAT** if applicable
3. Set up **automatic tax calculation**
4. Configure **VAT rates** for digital services

### Set Up Products and Prices

1. Go to **Products** in Stripe Dashboard
2. Create two products:

**Product 1: Riverwalks Annual Subscription**
- Name: "Riverwalks Annual Subscription"
- Description: "Access to Riverwalks for GCSE Geography students - 1 year"
- Price: £1.99 GBP (one-time payment, not recurring)

**Product 2: Riverwalks Lifetime Access**
- Name: "Riverwalks Lifetime Access" 
- Description: "Lifetime access to Riverwalks for GCSE Geography students"
- Price: £3.50 GBP (one-time payment)

> **Note**: We use one-time payments instead of subscriptions to simplify billing and cancellation for students.

## 🔐 2. Environment Variables Setup

Add these variables to your `.env.local` file:

```bash
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Use sk_live_... for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # From webhook endpoint setup

# Optional: Google Maps (if not already set)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### Getting Stripe Keys

1. **Publishable Key**: Dashboard → Developers → API keys → Publishable key
2. **Secret Key**: Dashboard → Developers → API keys → Secret key (click "Reveal")
3. **Webhook Secret**: Set up webhook first (see step 4), then copy signing secret

## 🗄️ 3. Database Setup

Run the subscription system migration in your Supabase SQL editor:

```sql
-- Execute the file: supabase/add-subscription-system.sql
-- This creates all tables, RLS policies, and functions
```

The migration creates:
- `subscriptions` table with Stripe integration
- `vouchers` table with admin management
- `voucher_usage` tracking for analytics
- `payment_events` audit trail for compliance
- `gdpr_requests` for data subject rights
- Helper functions for subscription validation

## 🔗 4. Webhook Configuration

### Create Webhook Endpoint

1. Go to **Developers → Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set URL: `https://riverwalks.co.uk/api/stripe/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### Configure Webhook Secret

1. Copy the **Signing secret** from the webhook endpoint
2. Add it to your environment variables as `STRIPE_WEBHOOK_SECRET`

## 💳 5. Test the Integration

### Test Cards (Development)

Use these test cards in development:

```
Successful payment: 4242 4242 4242 4242
Declined payment: 4000 0000 0000 0002
Requires 3D Secure: 4000 0000 0000 3220
```

### Test Workflow

1. **Create test voucher**: Use admin interface to create test vouchers
2. **Test payment flow**: Try both annual and lifetime plans
3. **Test voucher validation**: Apply discount codes during checkout
4. **Test webhook handling**: Verify payments are recorded in database
5. **Test subscription status**: Check user dashboard shows correct status

## 🎫 6. Voucher System

### Pre-created Vouchers

The migration includes three test vouchers:
- `LAUNCH50`: 50% off (100 uses)
- `TEACHER100`: 100% off for teachers (50 uses)
- `FREEYEAR`: Free first year - £1.99 off (25 uses)

### Creating New Vouchers

Use the admin API endpoint `/api/admin/vouchers`:

```javascript
// Example: Create 75% off voucher for beta testers
const voucher = {
  code: "BETA75",
  discountType: "percentage",
  discountValue: 75,
  maxUses: 200,
  validUntil: "2025-12-31T23:59:59Z",
  planTypes: ["yearly", "lifetime"],
  newUsersOnly: true,
  description: "75% off for beta testers",
  internalNotes: "Marketing campaign Q4 2024"
};
```

### Voucher Management Features

- **Usage tracking**: See how many times each voucher has been used
- **Revenue impact**: Track total discounts given
- **User restrictions**: New users only or all users
- **Plan restrictions**: Apply to specific subscription plans
- **Expiry dates**: Time-limited promotions
- **Deactivation**: Safely disable without breaking history

## 🔒 7. Security Considerations

### PCI Compliance

- ✅ **No card data storage**: Stripe handles all sensitive card information
- ✅ **Secure transmission**: All payments processed via HTTPS
- ✅ **Webhook verification**: Verify webhook signatures
- ✅ **Environment variables**: Never commit secrets to git

### Data Protection

- ✅ **Minimal data collection**: Only collect necessary information
- ✅ **Encryption at rest**: Supabase encrypts all data
- ✅ **Access controls**: RLS policies prevent unauthorized access
- ✅ **Audit trail**: Payment events logged for compliance

### Admin Access

- ✅ **Email-based admin**: Only `lukekirsten91@gmail.com` can manage vouchers
- ✅ **No admin UI exposure**: Admin endpoints require authentication
- ✅ **Audit logging**: All admin actions logged

## 📋 8. Legal Compliance

### GDPR Features

- **Data export**: Users can request all their data
- **Account deletion**: Complete data removal including Stripe cancellation
- **Data correction**: Users can update their information
- **Consent tracking**: Terms acceptance recorded with timestamps

### Refund Policy

- **7-day refund**: Full refund within 7 days of purchase
- **Pro-rata refunds**: Partial refunds for annual subscriptions if cancelled early
- **Lifetime policy**: Refunds considered on case-by-case basis

### Subscription Transparency

- **Clear pricing**: No hidden fees or automatic renewals for annual plan
- **Easy cancellation**: Cancel anytime through user dashboard
- **Access continuation**: Continued access until period end after cancellation
- **Email notifications**: Confirmation and reminder emails

## 🚀 9. Deployment Checklist

### Before Going Live

- [ ] Switch to Stripe live keys (`sk_live_...` and `pk_live_...`)
- [ ] Update webhook endpoint URL for production
- [ ] Set up proper error monitoring (Sentry)
- [ ] Test all payment flows end-to-end
- [ ] Verify webhook handling in production
- [ ] Set up Stripe notifications for failed payments
- [ ] Configure email templates for payment confirmations

### Production Environment Variables

```bash
# Production Stripe keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Production Supabase (if different)
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

## 📊 10. Analytics and Monitoring

### Key Metrics to Track

- **Conversion rate**: Visitors to paid subscribers
- **Voucher usage**: Most popular discount codes
- **Plan popularity**: Annual vs lifetime preference
- **Payment failures**: Monitor and address issues
- **Churn rate**: Cancellation patterns

### Stripe Dashboard Insights

- Navigate to **Analytics** for revenue reports
- Use **Customers** to track user subscriptions
- Monitor **Events** for webhook processing
- Review **Disputes** for any payment issues

## ⚠️ 11. Common Issues and Solutions

### Webhook Failures

**Issue**: Webhooks not reaching your endpoint
**Solution**: 
1. Check webhook URL is correct and accessible
2. Verify HTTPS is enabled
3. Check Stripe webhook logs for errors
4. Ensure webhook secret matches environment variable

### Payment Failures

**Issue**: Cards being declined
**Solution**:
1. Verify test card numbers in development
2. Check Stripe Dashboard for decline reasons
3. Ensure proper error handling in checkout flow
4. Test with multiple card types

### Database Issues

**Issue**: RLS policies blocking operations
**Solution**:
1. Use service role key for webhook operations
2. Verify user authentication in client operations
3. Check RLS policies match your access patterns
4. Test with proper user context

## 📞 12. Support and Resources

### Stripe Resources

- **Documentation**: https://stripe.com/docs
- **API Reference**: https://stripe.com/docs/api
- **Webhook Guide**: https://stripe.com/docs/webhooks
- **Test Cards**: https://stripe.com/docs/testing

### Support Channels

- **Stripe Support**: Available 24/7 via dashboard
- **Supabase Support**: Community forums and documentation
- **Legal Compliance**: Consider consulting with legal professional for specific requirements

---

## 🎯 Next Steps

After completing this setup:

1. **Test thoroughly** with test cards and vouchers
2. **Review legal compliance** with terms and privacy policy
3. **Set up monitoring** for payment failures and errors
4. **Plan marketing** for voucher campaigns
5. **Prepare customer support** for payment-related questions

This setup provides a complete, secure, and legally compliant payment system for Riverwalks that serves GCSE Geography students with transparency and ease of use.