# LeadFinder - Business Lead Generation SaaS 🔍

## Project Overview

LeadFinder is a comprehensive SaaS platform that combines a Chrome Extension with a Next.js backend for finding business leads using Google Places API. Users can search for businesses by type and location, manage their leads with advanced filtering options, and export data to CSV. The platform features subscription-based access with different tiers offering varying search limits and premium features like website status filtering.

## 🌟 Key Features

### User-Facing
- **Chrome Extension** with easy-to-use popup interface for searching leads
- **Google Places Integration** to find businesses with contact information, ratings, and reviews
- **Advanced Filtering** for Pro/Enterprise users (filter by website status, ratings, etc.)
- **CSV Export** with customizable fields and advanced formatting options
- **Real-time Search** with progress tracking and result previews
- **Quota Management** with clear usage tracking and limits

### Admin/User Management
- **Secure Authentication** with Supabase Auth and email verification
- **Subscription Management** with Stripe integration and billing portal
- **Dashboard Analytics** showing search history and quota usage
- **Account Management** with profile settings and subscription controls
- **Lead Management** with search history and organized lead lists

## 🛠️ Tech Stack

**Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui

**Backend/Database:** Supabase (PostgreSQL with Row Level Security)

**Authentication:** Supabase Auth with JWT tokens

**Payments:** Stripe with webhooks for subscription management

**API Integration:** Google Places API for business data

**Chrome Extension:** Vanilla JavaScript with modern ES6+ features

**Hosting:** Vercel with automatic deployments

**Other notable libraries:** React Hook Form, Recharts for analytics, CSV export utilities

## 💰 Subscription Plans

### Free Plan - $0/month
- 10 searches per month
- Up to 20 results per search
- Basic CSV export
- Standard support

### Pro Plan - $120/month
- 1,000 searches per month
- Up to 50 results per search
- **Advanced filtering options** (website status, ratings)
- Priority CSV export with custom fields
- Priority support

### Enterprise Plan - $1,350/month
- 5,000 searches per month
- Up to 100 results per search
- **All advanced filtering options**
- API access for integrations
- Custom export formats
- Dedicated support

## 📦 Installation & Setup

**Clone the repository:**
\`\`\`bash
git clone <repository-url>
cd leadfinder
\`\`\`

**Install dependencies:**
\`\`\`bash
npm install
\`\`\`

**Configure environment variables (.env.local):**
\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=your_stripe_pro_price_id
STRIPE_ENTERPRISE_PRICE_ID=your_stripe_enterprise_price_id

# Email Sending (Gmail recommended for no-domain setup)
EMAIL_PROVIDER=gmail
GMAIL_CLIENT_ID=your_google_oauth_client_id
GMAIL_CLIENT_SECRET=your_google_oauth_client_secret
GMAIL_REFRESH_TOKEN=your_google_oauth_refresh_token
GMAIL_SENDER_EMAIL=yourgmail@gmail.com
GMAIL_REPLY_TO=yourgmail@gmail.com

# Optional Resend fallback
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender
RESEND_WEBHOOK_SECRET=your_resend_webhook_secret

# SMS Sending (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+15551234567

# Optional root/admin accounts
ADMIN_EMAILS=you@yourdomain.com,ops@yourdomain.com

# Scheduled search cron security (recommended in production)
CRON_SECRET=your_random_long_secret

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
\`\`\`

**Set up the database:**
Run the SQL script in your Supabase SQL editor:
\`\`\`sql
-- Execute scripts in order:
-- 1) scripts/001_create_database_schema.sql
-- 2) scripts/002_add_outreach_features.sql
-- 3) scripts/003_add_automation_and_sms.sql
-- 4) scripts/004_add_email_delivery_tracking.sql
\`\`\`

**Configure Google Places API:**
- Enable Google Places API in Google Cloud Console
- Create an API key with Places API permissions
- Add usage quotas and restrictions as needed

**Set up Stripe:**
- Create products and prices for Pro ($120/month) and Enterprise ($1,350/month) plans
- Configure webhook endpoint: `https://your-domain.com/api/stripe/webhook`
- Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

**Start the development server:**
\`\`\`bash
npm run dev
\`\`\`

**Chrome Extension Setup:**
- Open Chrome and navigate to `chrome://extensions/`
- Enable "Developer mode"
- Click "Load unpacked" and select the `public/chrome-extension/` folder
- Update the API base URL in `popup.js` to match your development server

Visit the app at http://localhost:3000

## 🚀 Chrome Extension Installation

### For Development:
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select `public/chrome-extension/`
4. The extension will appear in your Chrome toolbar

### For Production:
1. Update `popup.js` with your production API URL
2. Package the extension folder as a ZIP file
3. Submit to Chrome Web Store through the Developer Dashboard

## 📊 API Endpoints

### Authentication
- `POST /api/auth` - User signup/signin with email verification
- `GET /api/auth` - Get current authenticated user
- `POST /api/auth/signout` - Sign out user

### Lead Search & Management
- `POST /api/search` - Search for business leads with Google Places
- `GET /api/leads` - Get user's leads with pagination and filtering
- `GET /api/leads/export` - Basic CSV export of leads
- `GET /api/leads/export/advanced` - Advanced CSV export with custom options
- `GET /api/scheduled-searches` - List weekly scheduled searches + recent runs
- `POST /api/scheduled-searches` - Create a weekly scheduled search
- `PATCH /api/scheduled-searches/:id` - Update/pause/resume a schedule
- `DELETE /api/scheduled-searches/:id` - Delete a schedule
- `POST /api/scheduled-searches/:id/run` - Run one scheduled search immediately
- `GET /api/scheduled-searches/run-due` - Cron endpoint to run all due schedules
- `POST /api/sms-campaigns/send` - Send SMS to leads in a search or selected leads
- `POST /api/webhooks/resend` - Receive Resend delivery events and update send status

### User Management
- `GET /api/user/quota` - Get current quota usage and limits
- `GET /api/user/profile` - Get user profile and subscription info
- `POST /api/user/downgrade-to-free` - Downgrade subscription to free tier
- `POST /api/user/sync-subscription` - Manually sync Stripe subscription status

### Payment Processing
- `POST /api/stripe/create-checkout-session` - Create subscription checkout
- `POST /api/stripe/create-portal-session` - Access Stripe billing portal
- `POST /api/stripe/webhook` - Handle Stripe subscription webhooks

## 🔒 Security Features

- **Row Level Security (RLS)** on all Supabase tables
- **JWT Authentication** required for all API endpoints
- **Quota Enforcement** to prevent abuse and ensure fair usage
- **Input Validation** and sanitization on all user inputs
- **CORS Protection** with proper origin restrictions
- **Webhook Signature Verification** for Stripe events
- **Environment Variable Protection** with proper scoping

## 🗄️ Database Schema

### Users Table
\`\`\`sql
users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscription_tier TEXT DEFAULT 'free',
  monthly_quota INTEGER DEFAULT 10,
  used_quota INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
\`\`\`

### Searches Table
\`\`\`sql
searches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
)
\`\`\`

### Leads Table
\`\`\`sql
leads (
  id UUID PRIMARY KEY,
  search_id UUID REFERENCES searches(id),
  user_id UUID REFERENCES users(id),
  business_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  rating DECIMAL(2,1),
  total_ratings INTEGER,
  place_id TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
)
\`\`\`

## 🚀 Deployment

### Backend (Vercel)
1. Connect your GitHub repository to Vercel
2. Configure all environment variables in Vercel dashboard
3. Deploy with automatic builds on push to main branch
4. Set up Stripe webhook endpoint with your production URL

### Chrome Extension
1. Update API URLs in `popup.js` to production endpoints
2. Test thoroughly in development mode
3. Package and submit to Chrome Web Store
4. Follow Chrome Web Store policies and guidelines

## 🔗 Live Demo

Experience the live application: [Your Production URL]

Chrome Extension: [Chrome Web Store Link]

---

Built with ❤️ using Next.js, Supabase, Stripe, and Google Places API.

```
leadfinder
├─ API_DOCUMENTATION.md
├─ app
│  ├─ account
│  │  └─ page.tsx
│  ├─ api
│  │  ├─ auth
│  │  │  └─ route.ts
│  │  ├─ leads
│  │  │  ├─ export
│  │  │  │  ├─ advanced
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ route.ts
│  │  │  └─ route.ts
│  │  ├─ search
│  │  │  └─ route.ts
│  │  ├─ stripe
│  │  │  ├─ create-checkout-session
│  │  │  │  └─ route.ts
│  │  │  ├─ create-portal-session
│  │  │  │  └─ route.ts
│  │  │  └─ webhook
│  │  │     └─ route.ts
│  │  └─ user
│  │     ├─ downgrade-to-free
│  │     │  └─ route.ts
│  │     ├─ profile
│  │     │  └─ route.ts
│  │     ├─ quota
│  │     │  └─ route.ts
│  │     └─ sync-subscription
│  │        └─ route.ts
│  ├─ auth
│  │  ├─ login
│  │  │  └─ page.tsx
│  │  ├─ signout
│  │  │  └─ route.ts
│  │  ├─ signup
│  │  │  └─ page.tsx
│  │  └─ verify-email
│  │     └─ page.tsx
│  ├─ dashboard
│  │  └─ page.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ leads
│  │  └─ page.tsx
│  └─ pricing
│     └─ page.tsx
├─ components
│  ├─ export-dialog.tsx
│  ├─ theme-provider.tsx
│  └─ ui
│     ├─ accordion.tsx
│     ├─ alert-dialog.tsx
│     ├─ alert.tsx
│     ├─ aspect-ratio.tsx
│     ├─ avatar.tsx
│     ├─ badge.tsx
│     ├─ breadcrumb.tsx
│     ├─ button.tsx
│     ├─ calendar.tsx
│     ├─ card.tsx
│     ├─ carousel.tsx
│     ├─ chart.tsx
│     ├─ checkbox.tsx
│     ├─ collapsible.tsx
│     ├─ command.tsx
│     ├─ context-menu.tsx
│     ├─ dialog.tsx
│     ├─ drawer.tsx
│     ├─ dropdown-menu.tsx
│     ├─ form.tsx
│     ├─ hover-card.tsx
│     ├─ input-otp.tsx
│     ├─ input.tsx
│     ├─ label.tsx
│     ├─ menubar.tsx
│     ├─ navigation-menu.tsx
│     ├─ pagination.tsx
│     ├─ popover.tsx
│     ├─ progress.tsx
│     ├─ radio-group.tsx
│     ├─ resizable.tsx
│     ├─ scroll-area.tsx
│     ├─ select.tsx
│     ├─ separator.tsx
│     ├─ sheet.tsx
│     ├─ sidebar.tsx
│     ├─ skeleton.tsx
│     ├─ slider.tsx
│     ├─ sonner.tsx
│     ├─ switch.tsx
│     ├─ table.tsx
│     ├─ tabs.tsx
│     ├─ textarea.tsx
│     ├─ toast.tsx
│     ├─ toaster.tsx
│     ├─ toggle-group.tsx
│     ├─ toggle.tsx
│     ├─ tooltip.tsx
│     ├─ use-mobile.tsx
│     └─ use-toast.ts
├─ components.json
├─ DEPLOYMENT_GUIDE.md
├─ hooks
│  ├─ use-mobile.ts
│  └─ use-toast.ts
├─ lib
│  ├─ csv-export.ts
│  ├─ google-places.ts
│  ├─ stripe.ts
│  ├─ supabase
│  │  ├─ client.ts
│  │  ├─ middleware.ts
│  │  └─ server.ts
│  └─ utils.ts
├─ middleware.ts
├─ next.config.mjs
├─ package-lock.json
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ public
│  ├─ chrome-extension
│  │  ├─ icons
│  │  │  ├─ icon128.jpg
│  │  │  ├─ icon16.jpg
│  │  │  └─ icon48.jpg
│  │  ├─ manifest.json
│  │  ├─ popup.html
│  │  ├─ popup.js
│  │  └─ README.md
│  ├─ placeholder-logo.png
│  ├─ placeholder-logo.svg
│  ├─ placeholder-user.jpg
│  ├─ placeholder.jpg
│  └─ placeholder.svg
├─ README.md
├─ scripts
│  └─ 001_create_database_schema.sql
├─ styles
│  └─ globals.css
├─ tsconfig.json
└─ types
   └─ index.ts

```
