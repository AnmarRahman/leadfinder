# LeadFinder API Documentation

This document provides comprehensive API documentation for the LeadFinder backend services.

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.vercel.app`

## Authentication

All API endpoints (except authentication endpoints) require a valid user session. Authentication is handled via Supabase Auth with JWT tokens.

### Headers
\`\`\`
Authorization: Bearer <jwt_token>
Content-Type: application/json
\`\`\`

## Endpoints

### Authentication

#### POST /api/auth
Create a new user account or sign in to existing account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123",
  "action": "signup" | "signin"
}
\`\`\`

**Response (Success):**
\`\`\`json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token"
    }
  }
}
\`\`\`

**Response (Error):**
\`\`\`json
{
  "error": "Invalid credentials"
}
\`\`\`

#### GET /api/auth
Get current authenticated user information.

**Response (Success):**
\`\`\`json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "profile": {
    "id": "uuid",
    "email": "user@example.com",
    "subscription_tier": "free",
    "monthly_quota": 100,
    "used_quota": 25,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

### Lead Search

#### POST /api/search
Search for business leads using Google Places API.

**Request Body:**
\`\`\`json
{
  "query": "restaurants",
  "location": "New York, NY"
}
\`\`\`

**Response (Success):**
\`\`\`json
{
  "searchId": "uuid",
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Restaurant Name",
      "formatted_address": "123 Main St, New York, NY 10001",
      "formatted_phone_number": "(555) 123-4567",
      "website": "https://restaurant.com",
      "rating": 4.5,
      "user_ratings_total": 150
    }
  ],
  "remainingQuota": 75
}
\`\`\`

**Response (Error - Quota Exceeded):**
\`\`\`json
{
  "error": "Monthly quota exceeded"
}
\`\`\`

### Scheduled Search Automation

#### GET /api/scheduled-searches
List the authenticated user's weekly scheduled searches and recent run history.

#### POST /api/scheduled-searches
Create a weekly scheduled search.

**Request Body:**
\`\`\`json
{
  "name": "Dentists in Montreal weekly",
  "query": "dentist",
  "location": "Montreal, QC",
  "maxResults": 50,
  "websiteFilter": "all",
  "findEmails": false,
  "nextRunAt": "2026-04-16T10:00:00.000Z",
  "enabled": true
}
\`\`\`

#### PATCH /api/scheduled-searches/:scheduleId
Update or pause/resume an existing weekly scheduled search.

#### DELETE /api/scheduled-searches/:scheduleId
Delete a scheduled search.

#### POST /api/scheduled-searches/:scheduleId/run
Run one scheduled search immediately (manual trigger).

#### GET /api/scheduled-searches/run-due
Cron endpoint that runs all due scheduled searches.

### Lead Management

#### GET /api/leads
Retrieve user's collected leads with pagination.

**Query Parameters:**
- `searchId` (optional): Filter by specific search
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50)

**Response:**
\`\`\`json
{
  "leads": [
    {
      "id": "uuid",
      "business_name": "Restaurant Name",
      "address": "123 Main St, New York, NY 10001",
      "phone": "(555) 123-4567",
      "website": "https://restaurant.com",
      "rating": 4.5,
      "total_ratings": 150,
      "created_at": "2024-01-01T00:00:00Z",
      "searches": {
        "query": "restaurants",
        "location": "New York, NY",
        "created_at": "2024-01-01T00:00:00Z"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
\`\`\`

#### GET /api/leads/export
Export leads to CSV format.

**Query Parameters:**
- `searchId` (optional): Export specific search results only

**Response:**
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename="leads-2024-01-01.csv"`

**CSV Format:**
\`\`\`csv
Business Name,Address,Phone,Website,Rating,Total Ratings,Search Query,Search Location,Date Found
"Restaurant Name","123 Main St, New York, NY 10001","(555) 123-4567","https://restaurant.com",4.5,150,"restaurants","New York, NY","1/1/2024"
\`\`\`

#### GET /api/leads/export/advanced
Advanced CSV export with customizable options.

**Query Parameters:**
- `searchId` (optional): Export specific search results
- `includeRatings` (optional): Include rating data (default: true)
- `includeSearchInfo` (optional): Include search query/location (default: true)
- `dateFormat` (optional): Date format - "US", "ISO", or "EU" (default: "US")
- `format` (optional): Response format - "csv" or "summary" (default: "csv")

**Response (CSV):**
Same as `/api/leads/export` but with customizable fields.

**Response (Summary):**
\`\`\`json
{
  "totalLeads": 100,
  "businessesWithPhone": 85,
  "businessesWithWebsite": 60,
  "averageRating": 4.2,
  "topSearchQueries": [
    {
      "query": "restaurants",
      "count": 45
    },
    {
      "query": "cafes",
      "count": 30
    }
  ]
}
\`\`\`

### Outreach

#### POST /api/email-campaigns/send
Send an email template campaign to all leads in a search or a selected list of lead IDs.

#### POST /api/sms-campaigns/send
Send SMS outreach to all leads in a search or a selected list of lead IDs.

**Request Body:**
\`\`\`json
{
  "message": "Hi {{business_name}}, I can help you build a website.",
  "searchId": "uuid",
  "leadIds": ["uuid1", "uuid2"]
}
\`\`\`

#### POST /api/webhooks/resend
Receives Resend webhook delivery events and updates `email_sends` records.

**Required Header Verification Inputs:**
- `svix-id`
- `svix-timestamp`
- `svix-signature`

**Required Environment Variable:**
- `RESEND_WEBHOOK_SECRET`

**Supported Event Types:**
- `email.delivered`
- `email.bounced`
- `email.failed`
- `email.complained`
- `email.opened`
- `email.clicked`
- `email.delivery_delayed`

### User Management

#### GET /api/user/quota
Get user's quota information.

**Response:**
\`\`\`json
{
  "monthlyQuota": 100,
  "usedQuota": 25,
  "remainingQuota": 75,
  "subscriptionTier": "free"
}
\`\`\`

### Payment Processing

#### POST /api/stripe/create-checkout-session
Create a Stripe checkout session for subscription upgrade.

**Request Body:**
\`\`\`json
{
  "planType": "pro" | "enterprise"
}
\`\`\`

**Response:**
\`\`\`json
{
  "sessionId": "cs_test_..."
}
\`\`\`

#### POST /api/stripe/create-portal-session
Create a Stripe billing portal session for subscription management.

**Response:**
\`\`\`json
{
  "url": "https://billing.stripe.com/session/..."
}
\`\`\`

#### POST /api/stripe/webhook
Handle Stripe webhook events (internal endpoint).

**Supported Events:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (quota exceeded)
- `500` - Internal Server Error

**Error Response Format:**
\`\`\`json
{
  "error": "Error message description"
}
\`\`\`

## Rate Limiting

API endpoints are subject to the following limits:

- **Search API**: Limited by user's monthly quota
- **Export API**: 10 requests per minute per user
- **Authentication**: 5 requests per minute per IP
- **General API**: 100 requests per minute per user

## Data Models

### User Profile
\`\`\`typescript
interface User {
  id: string
  email: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  monthly_quota: number
  used_quota: number
  stripe_customer_id?: string
  stripe_subscription_id?: string
  created_at: string
  updated_at: string
}
\`\`\`

### Search Record
\`\`\`typescript
interface Search {
  id: string
  user_id: string
  query: string
  location: string
  results_count: number
  created_at: string
}
\`\`\`

### Lead Record
\`\`\`typescript
interface Lead {
  id: string
  search_id: string
  user_id: string
  business_name: string
  address?: string
  phone?: string
  website?: string
  rating?: number
  total_ratings?: number
  place_id?: string
  created_at: string
}
\`\`\`

### Email Send Record
\`\`\`typescript
interface EmailSend {
  id: string
  campaign_id: string
  user_id: string
  lead_id?: string
  recipient_email: string
  status: 'sent' | 'failed' | 'skipped'
  provider: 'gmail' | 'resend' | 'unknown'
  provider_message_id?: string
  delivery_status:
    | 'accepted'
    | 'delivered'
    | 'bounced'
    | 'failed'
    | 'complained'
    | 'opened'
    | 'clicked'
    | 'delivery_delayed'
  delivery_event_at?: string
  delivery_error?: string
  error_message?: string
  sent_at: string
}
\`\`\`

### Google Places Result
\`\`\`typescript
interface GooglePlacesResult {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
  business_status?: string
  opening_hours?: {
    open_now: boolean
    weekday_text: string[]
  }
  geometry: {
    location: {
      lat: number
      lng: number
    }
  }
}
\`\`\`

## SDK Examples

### JavaScript/Node.js
\`\`\`javascript
class LeadFinderAPI {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl
    this.token = token
  }

  async search(query, location) {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, location })
    })
    return response.json()
  }

  async getLeads(page = 1, limit = 50) {
    const response = await fetch(
      `${this.baseUrl}/api/leads?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    )
    return response.json()
  }

  async exportLeads(searchId = null) {
    const url = searchId 
      ? `${this.baseUrl}/api/leads/export?searchId=${searchId}`
      : `${this.baseUrl}/api/leads/export`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
    return response.blob()
  }
}
\`\`\`

### Python
\`\`\`python
import requests

class LeadFinderAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def search(self, query, location):
        response = requests.post(
            f'{self.base_url}/api/search',
            json={'query': query, 'location': location},
            headers=self.headers
        )
        return response.json()
    
    def get_leads(self, page=1, limit=50):
        response = requests.get(
            f'{self.base_url}/api/leads',
            params={'page': page, 'limit': limit},
            headers=self.headers
        )
        return response.json()
    
    def export_leads(self, search_id=None):
        params = {'searchId': search_id} if search_id else {}
        response = requests.get(
            f'{self.base_url}/api/leads/export',
            params=params,
            headers=self.headers
        )
        return response.content
\`\`\`

## Webhooks

### Stripe Webhooks
The application handles the following Stripe webhook events:

#### checkout.session.completed
Triggered when a user completes a subscription purchase.

**Payload:**
\`\`\`json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_...",
      "customer": "cus_...",
      "subscription": "sub_...",
      "metadata": {
        "supabase_user_id": "uuid",
        "plan_type": "pro"
      }
    }
  }
}
\`\`\`

#### customer.subscription.updated
Triggered when a subscription is modified.

#### customer.subscription.deleted
Triggered when a subscription is cancelled.

## Testing

### Test Credentials
For testing purposes, use Stripe test mode:

- Test Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

### Postman Collection
A Postman collection is available for testing all API endpoints. Import the collection and set the following variables:

- `baseUrl`: Your API base URL
- `authToken`: JWT token from authentication

---

For additional support or questions about the API, please refer to the main documentation or create an issue in the repository.
