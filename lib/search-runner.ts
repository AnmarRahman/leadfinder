import { isAdminEmail } from "@/lib/admin"
import { findBusinessEmailFromWebsite } from "@/lib/email-enrichment"
import { GooglePlacesService, type GooglePlaceDetails } from "@/lib/google-places"
import type { SupabaseClient } from "@supabase/supabase-js"

export type WebsiteFilter = "all" | "has-website" | "no-website"

interface UserProfileForSearch {
  id: string
  email: string | null
  monthly_quota: number
  used_quota: number
  subscription_tier: "free" | "pro" | "enterprise"
}

interface RunLeadSearchInput {
  supabase: SupabaseClient
  userId: string
  userEmail?: string | null
  query: string
  location: string
  maxResults: number
  websiteFilter?: WebsiteFilter
  findEmails?: boolean
  scheduledSearchId?: string | null
}

interface RunLeadSearchResult {
  searchId: string
  results: GooglePlaceDetails[]
  remainingQuota: number | null
  isAdmin: boolean
  newResultsCount: number
}

const tierLimits = {
  free: 20,
  pro: 50,
  enterprise: 100,
}

export class SearchRunError extends Error {
  status: number
  code?: string

  constructor(message: string, status = 500, code?: string) {
    super(message)
    this.name = "SearchRunError"
    this.status = status
    this.code = code
  }
}

function applyWebsiteFilter(results: GooglePlaceDetails[], websiteFilter: WebsiteFilter): GooglePlaceDetails[] {
  if (websiteFilter === "has-website") {
    return results.filter((result) => Boolean(result.website))
  }

  if (websiteFilter === "no-website") {
    return results.filter((result) => !result.website)
  }

  return results
}

async function enrichEmails(results: GooglePlaceDetails[], shouldEnrich: boolean): Promise<GooglePlaceDetails[]> {
  if (!shouldEnrich) {
    return results
  }

  const enrichedResults: GooglePlaceDetails[] = []
  for (const result of results) {
    if (!result.website) {
      enrichedResults.push(result)
      continue
    }

    const email = await findBusinessEmailFromWebsite(result.website)
    enrichedResults.push({
      ...result,
      email: email || undefined,
    })
  }

  return enrichedResults
}

function ensureValidWebsiteFilter(websiteFilter: WebsiteFilter) {
  const allowedWebsiteFilters: WebsiteFilter[] = ["all", "has-website", "no-website"]
  if (!allowedWebsiteFilters.includes(websiteFilter)) {
    throw new SearchRunError("Invalid website filter", 400)
  }
}

async function loadUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfileForSearch> {
  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("id, email, monthly_quota, used_quota, subscription_tier")
    .eq("id", userId)
    .single()

  if (profileError || !userProfile) {
    throw new SearchRunError("Failed to fetch user profile", 500)
  }

  return userProfile as UserProfileForSearch
}

async function loadExistingScheduledPlaceIds(
  supabase: SupabaseClient,
  userId: string,
  scheduledSearchId: string,
  places: GooglePlaceDetails[],
): Promise<Set<string>> {
  const currentPlaceIds = places.map((place) => place.place_id).filter(Boolean)
  if (currentPlaceIds.length === 0) {
    return new Set<string>()
  }

  const { data: existingRows, error } = await supabase
    .from("leads")
    .select("place_id")
    .eq("user_id", userId)
    .eq("scheduled_search_id", scheduledSearchId)
    .in("place_id", currentPlaceIds)

  if (error) {
    throw new SearchRunError("Failed to compare scheduled search results", 500)
  }

  return new Set((existingRows || []).map((row) => row.place_id).filter(Boolean))
}

export async function runLeadSearch(input: RunLeadSearchInput): Promise<RunLeadSearchResult> {
  const {
    supabase,
    userId,
    userEmail,
    query,
    location,
    maxResults,
    websiteFilter = "all",
    findEmails = false,
    scheduledSearchId = null,
  } = input

  if (!query || !location) {
    throw new SearchRunError("Query and location are required", 400)
  }

  ensureValidWebsiteFilter(websiteFilter)

  const userProfile = await loadUserProfile(supabase, userId)
  const emailForRoleCheck = userEmail || userProfile.email
  const isAdmin = isAdminEmail(emailForRoleCheck)
  const maxAllowedResults = isAdmin ? 100 : tierLimits[userProfile.subscription_tier] || 20
  const canUseAdvancedFilters =
    isAdmin || userProfile.subscription_tier === "pro" || userProfile.subscription_tier === "enterprise"

  if (websiteFilter !== "all" && !canUseAdvancedFilters) {
    throw new SearchRunError("Website filtering requires a Pro or Enterprise subscription.", 403)
  }

  if (findEmails && !canUseAdvancedFilters) {
    throw new SearchRunError("Email enrichment requires a Pro or Enterprise subscription.", 403)
  }

  if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > maxAllowedResults) {
    throw new SearchRunError(
      `maxResults must be between 1 and ${maxAllowedResults} for ${userProfile.subscription_tier} tier`,
      400,
    )
  }

  if (!isAdmin && userProfile.used_quota >= userProfile.monthly_quota) {
    throw new SearchRunError("Monthly quota exceeded", 429)
  }

  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!googleApiKey) {
    throw new SearchRunError("Google Places API key not configured", 500)
  }

  const placesService = new GooglePlacesService(googleApiKey)
  const expandedResultsLimit =
    websiteFilter === "all"
      ? maxResults
      : Math.min(maxAllowedResults, Math.max(maxResults * 3, Math.min(maxAllowedResults, maxResults + 15)))

  const rawPlaces = await placesService.searchPlaces({
    query,
    location,
    radius: 10000,
    maxResults: expandedResultsLimit,
  })

  const filteredPlaces = applyWebsiteFilter(rawPlaces, websiteFilter).slice(0, maxResults)
  const places = await enrichEmails(filteredPlaces, findEmails)

  const existingScheduledPlaceIds =
    scheduledSearchId && places.length > 0
      ? await loadExistingScheduledPlaceIds(supabase, userId, scheduledSearchId, places)
      : new Set<string>()

  const { data: searchRecord, error: searchError } = await supabase
    .from("searches")
    .insert({
      user_id: userId,
      query,
      location,
      website_filter: websiteFilter,
      email_enrichment_enabled: Boolean(findEmails),
      results_count: places.length,
      scheduled_search_id: scheduledSearchId,
    })
    .select("id")
    .single()

  if (searchError || !searchRecord) {
    throw new SearchRunError("Failed to create search record", 500)
  }

  const leadsData = places.map((place) => ({
    search_id: searchRecord.id,
    user_id: userId,
    scheduled_search_id: scheduledSearchId,
    is_new_in_run: scheduledSearchId ? !existingScheduledPlaceIds.has(place.place_id) : false,
    business_name: place.name,
    address: place.formatted_address,
    phone: place.formatted_phone_number || null,
    website: place.website || null,
    rating: place.rating || null,
    total_ratings: place.user_ratings_total || null,
    place_id: place.place_id || null,
    email: place.email || null,
  }))

  if (leadsData.length > 0) {
    const { error: leadsError } = await supabase.from("leads").insert(leadsData)
    if (leadsError) {
      throw new SearchRunError("Failed to save leads", 500)
    }
  }

  if (!isAdmin) {
    const { error: quotaError } = await supabase
      .from("users")
      .update({ used_quota: userProfile.used_quota + 1 })
      .eq("id", userId)

    if (quotaError) {
      console.error("Failed to update quota:", quotaError)
    }
  }

  const newResultsCount = scheduledSearchId
    ? leadsData.filter((lead) => lead.is_new_in_run).length
    : 0

  return {
    searchId: searchRecord.id,
    results: places,
    remainingQuota: isAdmin ? null : userProfile.monthly_quota - userProfile.used_quota - 1,
    isAdmin,
    newResultsCount,
  }
}
