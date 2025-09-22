# LeadFinder - Business Lead Generation SaaS

LeadFinder is a comprehensive Chrome Extension + Backend SaaS application for finding business leads using Google Places API. Users can search for businesses by type and location, manage their leads, and export data to CSV.

## Features

### Core Functionality
- **Chrome Extension**: Easy-to-use popup interface for searching leads
- **Google Places Integration**: Find businesses with contact information, ratings, and reviews
- **User Authentication**: Secure signup/signin with email verification
- **Quota Management**: Track monthly search limits based on subscription tier
- **CSV Export**: Advanced export options with customizable fields and formats
- **Subscription Management**: Stripe-powered billing with multiple tiers

### Subscription Tiers
- **Free**: 100 searches/month, basic features
- **Pro**: 1,000 searches/month, enhanced features, priority support ($29/month)
- **Enterprise**: 5,000 searches/month, premium features, API access ($99/month)

## Tech Stack

### Backend
- **Framework**: Next.js 15 with App Router
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **API Integration**: Google Places API
- **Deployment**: Vercel

### Frontend
- **UI Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Chrome Extension**: Vanilla JavaScript with modern ES6+

## Project Structure

\`\`\`
leadfinder/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── search/               # Lead search functionality
│   │   ├── leads/                # Lead management and export
│   │   ├── stripe/               # Payment processing
│   │   └── user/                 # User management
│   ├── auth/                     # Authentication pages
│   ├── dashboard/                # Main dashboard
│   ├── leads/                    # Lead management interface
│   ├── pricing/                  # Subscription plans
│   └── account/                  # Account settings
├── components/                   # Reusable React components
├── lib/                          # Utility libraries
│   ├── supabase/                 # Database client configuration
│   ├── stripe.ts                 # Payment processing
│   ├── google-places.ts          # Google Places API integration
│   └── csv-export.ts             # CSV export functionality
├── public/chrome-extension/      # Chrome extension files
│   ├── manifest.json             # Extension configuration
│   ├── popup.html                # Extension UI
│   ├── popup.js                  # Extension logic
│   └── icons/                    # Extension icons
├── scripts/                      # Database migration scripts
└── types/                        # TypeScript type definitions
\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Google Cloud Platform account (for Places API)
- Stripe account
- Vercel account (for deployment)

### Environment Variables

Create a `.env.local` file with the following variables:

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

# Application URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
\`\`\`

### Local Development

1. **Clone and Install**
   \`\`\`bash
   git clone <repository-url>
   cd leadfinder
   npm install
   \`\`\`

2. **Database Setup**
   - Create a new Supabase project
   - Run the database migration script:
     \`\`\`bash
     # In your Supabase SQL editor, run:
     # scripts/001_create_database_schema.sql
     \`\`\`

3. **Google Places API Setup**
   - Enable Google Places API in Google Cloud Console
   - Create an API key with Places API permissions
   - Add the API key to your environment variables

4. **Stripe Setup**
   - Create Stripe products and prices for Pro and Enterprise plans
   - Set up webhook endpoint for subscription events
   - Add Stripe keys to environment variables

5. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Chrome Extension Setup**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select `public/chrome-extension/`
   - Update `popup.js` with your local development URL

## Deployment

### Backend Deployment (Vercel)

1. **Deploy to Vercel**
   \`\`\`bash
   npm install -g vercel
   vercel
   \`\`\`

2. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Update `NEXT_PUBLIC_SITE_URL` to your Vercel domain

3. **Set up Stripe Webhooks**
   - Add webhook endpoint: `https://your-domain.vercel.app/api/stripe/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### Chrome Extension Deployment

1. **Update Extension Configuration**
   - Edit `public/chrome-extension/popup.js`
   - Change `apiBase` from localhost to your production URL
   - Update `manifest.json` host permissions if needed

2. **Package Extension**
   - Zip the `public/chrome-extension/` folder
   - Or use Chrome Developer Dashboard for publishing

3. **Chrome Web Store Submission**
   - Create developer account
   - Upload extension package
   - Complete store listing with screenshots and description

## API Documentation

### Authentication
- `POST /api/auth` - Sign up/sign in
- `GET /api/auth` - Get current user

### Lead Search
- `POST /api/search` - Search for business leads
- `GET /api/leads` - Get user's leads
- `GET /api/leads/export` - Export leads to CSV
- `GET /api/leads/export/advanced` - Advanced CSV export with options

### User Management
- `GET /api/user/quota` - Get user quota information

### Payments
- `POST /api/stripe/create-checkout-session` - Create subscription checkout
- `POST /api/stripe/create-portal-session` - Access billing portal
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## Database Schema

### Users Table
\`\`\`sql
users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  monthly_quota INTEGER DEFAULT 100,
  used_quota INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
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
  created_at TIMESTAMP
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
  place_id TEXT,
  created_at TIMESTAMP
)
\`\`\`

## Security Features

- **Row Level Security (RLS)**: All database tables protected with RLS policies
- **Authentication Required**: All API endpoints require valid user session
- **Quota Enforcement**: Prevents abuse with monthly search limits
- **Input Validation**: All user inputs validated and sanitized
- **CORS Protection**: Proper CORS configuration for API endpoints

## Monitoring and Analytics

### Key Metrics to Track
- User signups and retention
- Search volume by plan tier
- Conversion rates from free to paid
- API response times and error rates
- Chrome extension usage statistics

### Recommended Tools
- Vercel Analytics for web performance
- Supabase Dashboard for database monitoring
- Stripe Dashboard for payment analytics
- Google Cloud Monitoring for Places API usage

## Troubleshooting

### Common Issues

1. **Chrome Extension Not Loading**
   - Check manifest.json syntax
   - Verify host permissions include your backend URL
   - Check browser console for JavaScript errors

2. **Google Places API Errors**
   - Verify API key has Places API enabled
   - Check quota limits in Google Cloud Console
   - Ensure billing is enabled for the project

3. **Stripe Webhook Issues**
   - Verify webhook endpoint URL is correct
   - Check webhook secret matches environment variable
   - Monitor webhook delivery in Stripe dashboard

4. **Database Connection Issues**
   - Verify Supabase environment variables
   - Check RLS policies are correctly configured
   - Ensure user has proper permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact support through the application
- Check the troubleshooting section above

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.
