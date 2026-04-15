export interface User {
  id: string
  email: string
  subscription_tier: "free" | "pro" | "enterprise"
  monthly_quota: number
  used_quota: number
  stripe_customer_id?: string
  stripe_subscription_id?: string
  created_at: string
  updated_at: string
}

export interface Search {
  id: string
  user_id: string
  query: string
  location: string
  website_filter?: "all" | "has-website" | "no-website"
  email_enrichment_enabled?: boolean
  scheduled_search_id?: string | null
  results_count: number
  created_at: string
}

export interface Lead {
  id: string
  search_id: string
  user_id: string
  business_name: string
  address?: string
  phone?: string
  website?: string
  email?: string
  rating?: number
  total_ratings?: number
  place_id?: string
  scheduled_search_id?: string | null
  is_new_in_run?: boolean
  created_at: string
}

export interface GooglePlacesResult {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  rating?: number
  user_ratings_total?: number
}
