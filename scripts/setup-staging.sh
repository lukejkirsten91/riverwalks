#!/bin/bash

# Riverwalks Staging Environment Setup Script
# Run this after creating your staging Supabase project

echo "🚀 Setting up Riverwalks staging environment..."

# Create staging branch if it doesn't exist
if ! git show-ref --verify --quiet refs/heads/staging; then
  echo "📝 Creating staging branch..."
  git checkout -b staging
  git push -u origin staging
else
  echo "✅ Staging branch already exists"
  git checkout staging
fi

echo "
📋 Manual steps required:

1. 🗄️  Create staging Supabase project:
   - Go to https://supabase.com/dashboard
   - Click 'New Project'
   - Name: riverwalks-staging
   - Save the new credentials

2. 🔧 Configure Vercel staging project:
   vercel --project-name=riverwalks-staging

3. 🔐 Add environment variables in Vercel dashboard:
   NODE_ENV=production
   NEXT_PUBLIC_ENVIRONMENT=staging
   NEXT_PUBLIC_SUPABASE_URL=<your_staging_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_staging_anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<your_staging_service_key>
   STRIPE_LIVE_MODE=false
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...

4. 🗃️  Run database migrations in staging Supabase SQL Editor:
   - Copy and run all files from supabase/ folder
   - Run supabase/add-admin-roles-fixed.sql

5. 🎯 Set Vercel staging project to deploy from 'staging' branch

✅ Your staging workflow will be:
   git checkout staging
   git merge feature-branch
   git push origin staging
   → Test at https://riverwalks-staging.vercel.app
   → If good, merge to main for production
"

echo "🎉 Staging setup script complete!"