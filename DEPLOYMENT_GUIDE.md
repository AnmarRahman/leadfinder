# LeadFinder Deployment Guide

This guide provides step-by-step instructions for deploying LeadFinder to production.

## Pre-Deployment Checklist

- [ ] Supabase project created and configured
- [ ] Google Places API key obtained
- [ ] Stripe account set up with products/prices
- [ ] Domain name ready (optional)
- [ ] Chrome extension assets prepared

## Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 1.2 Run Database Migrations
1. Go to SQL Editor in Supabase dashboard
2. Execute the scripts in order:
   - `scripts/001_create_database_schema.sql`
   - `scripts/002_add_outreach_features.sql`
   - `scripts/003_add_automation_and_sms.sql`
   - `scripts/004_add_email_delivery_tracking.sql`
3. Verify tables are created with proper RLS policies

### 1.3 Configure Authentication
1. Go to Authentication > Settings
2. Enable email confirmations if desired
3. Set up redirect URLs for your domain

## Step 2: Google Cloud Platform Setup

### 2.1 Enable Places API
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the following APIs:
   - Places API
   - Geocoding API
4. Create credentials (API Key)
5. Restrict the API key to your server's IP or domain

### 2.2 Configure API Quotas
1. Set appropriate quotas for your expected usage
2. Enable billing to avoid quota limitations
3. Monitor usage in the console

## Step 3: Stripe Configuration

### 3.1 Create Products and Prices
1. Go to Stripe Dashboard > Products
2. Create two products:
   - **Pro Plan**: $29/month recurring
   - **Enterprise Plan**: $99/month recurring
3. Note down the Price IDs for environment variables

### 3.2 Configure Webhooks (After Vercel Deployment)
1. Go to Stripe Dashboard > Webhooks
2. Add endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Note down the webhook signing secret

## Step 4: Vercel Deployment

### 4.1 Deploy to Vercel
\`\`\`bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts to configure project
\`\`\`

### 4.2 Configure Environment Variables
In Vercel Dashboard > Settings > Environment Variables, add:

\`\`\`
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Places
GOOGLE_PLACES_API_KEY=your_google_api_key

# Cron security (used by /api/scheduled-searches/run-due)
CRON_SECRET=your_random_long_secret

# Stripe
STRIPE_SECRET_KEY=sk_live_your_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRO_PRICE_ID=price_your_pro_price_id
STRIPE_ENTERPRISE_PRICE_ID=price_your_enterprise_price_id

# Email sending (Gmail or Resend)
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
GMAIL_SENDER_EMAIL=yourgmail@gmail.com
GMAIL_REPLY_TO=yourgmail@gmail.com
RESEND_API_KEY=re_xxx_optional
RESEND_FROM_EMAIL=sender@yourdomain.com_optional
RESEND_WEBHOOK_SECRET=whsec_resend_xxx

# SMS sending (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+15551234567

# URLs
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
\`\`\`

### 4.3 Configure Vercel Cron Job
1. Keep `vercel.json` in the repo (already configured)
2. Confirm this cron is active after deployment:
   - `0 0 * * *` -> `GET /api/scheduled-searches/run-due`
3. Keep `CRON_SECRET` set in Vercel to protect the cron endpoint

### 4.4 Configure Resend Webhook (Email Delivery Tracking)
1. In Resend Dashboard, create a webhook endpoint:
   - `https://your-domain.vercel.app/api/webhooks/resend`
2. Select events:
   - `email.delivered`
   - `email.bounced`
   - `email.failed`
   - `email.complained`
   - `email.opened`
   - `email.clicked`
   - `email.delivery_delayed`
3. Copy the webhook signing secret into `RESEND_WEBHOOK_SECRET` in Vercel.

### 4.3 Configure Custom Domain (Optional)
1. Go to Vercel Dashboard > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update environment variables with new domain

## Step 5: Chrome Extension Deployment

### 5.1 Update Extension Configuration
1. Edit `public/chrome-extension/popup.js`
2. Change `apiBase` to your production URL:
   \`\`\`javascript
   this.apiBase = "https://your-domain.vercel.app"
   \`\`\`

### 5.2 Update Manifest
1. Edit `public/chrome-extension/manifest.json`
2. Update `host_permissions` to include your domain:
   \`\`\`json
   "host_permissions": ["https://your-domain.vercel.app/*"]
   \`\`\`

### 5.3 Package Extension
1. Create a ZIP file of the `public/chrome-extension/` folder
2. Ensure all files are included:
   - manifest.json
   - popup.html
   - popup.js
   - icons/ folder
   - README.md

### 5.4 Chrome Web Store Submission
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the $5 developer registration fee (one-time)
3. Upload your extension ZIP file
4. Fill out the store listing:
   - Title: "LeadFinder - Business Lead Generator"
   - Description: Include features and benefits
   - Screenshots: Show the extension in action
   - Category: Productivity
5. Submit for review (typically takes 1-3 days)

## Step 6: Post-Deployment Configuration

### 6.1 Update Stripe Webhooks
1. Go back to Stripe Dashboard > Webhooks
2. Update the endpoint URL to your production domain
3. Test webhook delivery

### 6.2 Configure Supabase Redirects
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add your production domain to allowed redirect URLs
3. Update site URL to your production domain

### 6.3 Test Complete Flow
1. Install the Chrome extension from the store
2. Create a test account
3. Perform a search
4. Test subscription upgrade
5. Test CSV export
6. Verify webhook events in Stripe

## Step 7: Monitoring Setup

### 7.1 Vercel Analytics
1. Enable Vercel Analytics in your dashboard
2. Monitor performance and usage

### 7.2 Supabase Monitoring
1. Monitor database performance
2. Set up alerts for high usage
3. Review RLS policy performance

### 7.3 Stripe Monitoring
1. Set up webhook monitoring
2. Monitor failed payments
3. Track subscription metrics

## Step 8: Security Hardening

### 8.1 API Security
- [ ] Verify all endpoints require authentication
- [ ] Test RLS policies with different user accounts
- [ ] Ensure sensitive data is not exposed in API responses

### 8.2 Chrome Extension Security
- [ ] Verify content security policy is restrictive
- [ ] Test extension with different websites
- [ ] Ensure no sensitive data is stored locally

### 8.3 Environment Security
- [ ] Use production Stripe keys
- [ ] Rotate API keys regularly
- [ ] Monitor for unusual API usage

## Rollback Plan

If issues occur during deployment:

1. **Vercel Rollback**
   \`\`\`bash
   vercel rollback
   \`\`\`

2. **Database Rollback**
   - Keep backups of database schema
   - Use Supabase point-in-time recovery if needed

3. **Chrome Extension Rollback**
   - Keep previous version ZIP file
   - Can update extension through Chrome Web Store

## Maintenance Tasks

### Weekly
- [ ] Monitor API usage and costs
- [ ] Review error logs in Vercel
- [ ] Check Stripe webhook delivery status

### Monthly
- [ ] Review user feedback and ratings
- [ ] Update dependencies if needed
- [ ] Analyze usage patterns and optimize

### Quarterly
- [ ] Security audit of API endpoints
- [ ] Performance optimization review
- [ ] Update Chrome extension if needed

## Support and Troubleshooting

### Common Production Issues

1. **High API Costs**
   - Monitor Google Places API usage
   - Implement caching if needed
   - Consider rate limiting

2. **Webhook Failures**
   - Check Stripe webhook logs
   - Verify endpoint is accessible
   - Monitor database for failed updates

3. **Extension Store Issues**
   - Monitor Chrome Web Store reviews
   - Respond to user feedback promptly
   - Keep extension updated

### Getting Help
- Vercel Support: [vercel.com/support](https://vercel.com/support)
- Supabase Support: [supabase.com/support](https://supabase.com/support)
- Stripe Support: [support.stripe.com](https://support.stripe.com)
- Google Cloud Support: [cloud.google.com/support](https://cloud.google.com/support)

---

## Deployment Checklist

Before going live, ensure:

- [ ] All environment variables are set correctly
- [ ] Database migrations have been run
- [ ] Stripe webhooks are configured and tested
- [ ] Chrome extension points to production API
- [ ] All API endpoints return expected responses
- [ ] User authentication flow works end-to-end
- [ ] Payment processing works correctly
- [ ] CSV export functionality works
- [ ] Chrome extension is submitted to store
- [ ] Monitoring and alerts are configured
- [ ] Security measures are in place
- [ ] Backup and rollback procedures are documented

Congratulations! Your LeadFinder application is now live in production.
