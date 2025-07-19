# Deployment Guide - Riverwalks

This guide explains how to set up staging and production environments for Riverwalks.

## Environment Overview

- **Development**: Local development with hot reloading
- **Staging**: Testing environment that mirrors production
- **Production**: Live environment serving real users

## Vercel Deployment Setup

### 1. Production Deployment (Current)

Your production site is already deployed at `https://riverwalks.co.uk`

**Environment Variables Required:**
```bash
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
STRIPE_LIVE_MODE=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_SECRET_KEY=sk_live_your_live_secret
STRIPE_WEBHOOK_SECRET=whsec_your_production_webhook
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YOUR_PRODUCTION_ID
```

### 2. Staging Deployment (Recommended Setup)

Create a separate Vercel project for staging:

```bash
# Deploy to staging
vercel --prod --project-name=riverwalks-staging
```

**Environment Variables for Staging:**
```bash
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_SUPABASE_URL=your_staging_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_key
STRIPE_LIVE_MODE=false
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
STRIPE_SECRET_KEY=sk_test_your_test_secret
STRIPE_WEBHOOK_SECRET=whsec_your_staging_webhook
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-YOUR_STAGING_ID
```

### 3. Database Setup

#### Production Database (Current)
Your existing Supabase production database

#### Staging Database (Recommended)
Create a separate Supabase project for staging:

1. Create new Supabase project for staging
2. Run all SQL migrations from `supabase/` folder
3. Run `supabase/add-admin-roles.sql` to set up admin access
4. Import sample data for testing

## Security Configuration

### Admin Access Setup

After deploying, you need to set up admin access:

```sql
-- Run this in your Supabase SQL editor for each environment
-- Replace 'your-email@gmail.com' with your actual admin email

SELECT auth.set_admin_status(
  (SELECT id FROM auth.users WHERE email = 'your-email@gmail.com'),
  true
);
```

### Stripe Webhook Configuration

1. **Production Webhooks**:
   - Endpoint: `https://riverwalks.co.uk/api/stripe/webhook`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`

2. **Staging Webhooks**:
   - Endpoint: `https://riverwalks-staging.vercel.app/api/stripe/webhook`  
   - Use test mode webhooks
   - Same events as production

## Deployment Workflow

### Recommended Git Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally
npm run dev

# 3. Push to staging for testing
git push origin feature/new-feature
# Deploy to staging environment

# 4. Test in staging environment
# - Verify all functionality works
# - Test payments with Stripe test cards
# - Check admin access
# - Verify email sending

# 5. Merge to main and deploy to production
git checkout main
git merge feature/new-feature
git push origin main
# Auto-deploys to production
```

### Pre-deployment Checklist

Before deploying to production:

- [ ] All TypeScript errors resolved (`npm run type-check`)
- [ ] All tests passing (if you add tests)
- [ ] Tested in staging environment
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Admin access verified
- [ ] Stripe webhooks configured
- [ ] Analytics tracking verified

## Environment Detection

The app automatically detects the environment using:

1. `NEXT_PUBLIC_ENVIRONMENT` variable (explicit)
2. `VERCEL_ENV` variable (Vercel automatic)
3. `NODE_ENV` variable (fallback)

You can check the current environment in code:

```typescript
import { getEnvironment } from '../lib/environment';

const env = getEnvironment(); // 'development' | 'staging' | 'production'
```

## Monitoring

### Production Monitoring
- Vercel Analytics (automatic)
- Google Analytics 4
- Stripe Dashboard
- Supabase Dashboard

### Staging Monitoring
- Separate GA4 property
- Stripe Test Dashboard
- Staging Supabase Dashboard

## Troubleshooting

### Common Issues

1. **Environment variables not loading**
   - Check Vercel project settings
   - Ensure variables are set for correct environment
   - Redeploy after changing variables

2. **Admin access not working**
   - Run admin setup SQL in correct database
   - Check user exists in auth.users table
   - Verify role-based access is configured

3. **Stripe webhooks failing**
   - Check webhook endpoint URL
   - Verify webhook secret matches
   - Check webhook event types

4. **Database connection issues**
   - Verify Supabase URLs and keys
   - Check RLS policies are correctly set
   - Ensure service role key has correct permissions

### Logs and Debugging

- **Vercel Function Logs**: Check in Vercel dashboard
- **Browser Console**: Only in development (production logs are sanitized)
- **Stripe Dashboard**: Payment and webhook events
- **Supabase Logs**: Database queries and auth events

## Security Notes

- Never commit `.env*` files to git
- Use different databases for staging/production
- Test mode for all staging payments
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated

## Backup Strategy

- **Database**: Supabase automatic backups
- **Files**: Stored in Supabase Storage (redundant)
- **Code**: Git repository on GitHub
- **Environment Config**: Document all variables securely