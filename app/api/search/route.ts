import { GooglePlacesQuotaError, GooglePlacesService } from "@/lib/google-places"
import { createRequestClient } from "@/lib/supabase/request"
import { findBusinessEmailFromWebsite } from "@/lib/email-enrichment"
import { isAdminEmail } from "@/lib/admin"
import { type NextRequest, NextResponse } from "next/server"

type WebsiteFilter = "all" | "has-website" | "no-website"

function applyWebsiteFilter(results: Awaited<ReturnType<GooglePlacesService["searchPlaces"]>>, websiteFilter: WebsiteFilter) {
  if (websiteFilter === "has-website") {
    return results.filter((result) => Boolean(result.website))
  }

  if (websiteFilter === "no-website") {
    return results.filter((result) => !result.website)
  }

  return results
}

async function enrichEmails(
  results: Awaited<ReturnType<GooglePlacesService["searchPlaces"]>>,
  shouldEnrich: boolean,
) {
  if (!shouldEnrich) {
    return results
  }

  const enrichedResults: Awaited<ReturnType<GooglePlacesService["searchPlaces"]>> = []
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

export async function POST(request: NextRequest) {
  const supabase = await createRequestClient(request)

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const isAdmin = isAdminEmail(user.email)

  try {
    const {
      query,
      location,
      maxResults = 20,
      websiteFilter = "all",
      findEmails = false,
    }: {
      query: string
      location: string
      maxResults?: number
      websiteFilter?: WebsiteFilter
      findEmails?: boolean
    } = await request.json()

    if (!query || !location) {
      return NextResponse.json({ error: "Query and location are required" }, { status: 400 })
    }

    const allowedWebsiteFilters: WebsiteFilter[] = ["all", "has-website", "no-website"]
    if (!allowedWebsiteFilters.includes(websiteFilter)) {
      return NextResponse.json({ error: "Invalid website filter" }, { status: 400 })
    }

    // Check user quota and get subscription tier
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("monthly_quota, used_quota, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    const tierLimits = {
      free: 20,
      pro: 50,
      enterprise: 100,
    }

    const maxAllowedResults = isAdmin ? 100 : tierLimits[userProfile.subscription_tier as keyof typeof tierLimits] || 20
    const canUseAdvancedFilters =
      isAdmin || userProfile.subscription_tier === "pro" || userProfile.subscription_tier === "enterprise"

    if (websiteFilter !== "all" && !canUseAdvancedFilters) {
      return NextResponse.json(
        { error: "Website filtering requires a Pro or Enterprise subscription." },
        { status: 403 },
      )
    }

    if (findEmails && !canUseAdvancedFilters) {
      return NextResponse.json(
        { error: "Email enrichment requires a Pro or Enterprise subscription." },
        { status: 403 },
      )
    }

    if (maxResults < 1 || maxResults > maxAllowedResults) {
      return NextResponse.json(
        {
          error: `maxResults must be between 1 and ${maxAllowedResults} for ${userProfile.subscription_tier} tier`,
        },
        { status: 400 },
      )
    }

    if (!isAdmin && userProfile.used_quota >= userProfile.monthly_quota) {
      return NextResponse.json({ error: "Monthly quota exceeded" }, { status: 429 })
    }

    // Initialize Google Places service
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    const placesService = new GooglePlacesService(googleApiKey)

    const expandedResultsLimit =
      websiteFilter === "all"
        ? maxResults
        : Math.min(maxAllowedResults, Math.max(maxResults * 3, Math.min(maxAllowedResults, maxResults + 15)))

    // Search for places
    const rawPlaces = await placesService.searchPlaces({
      query,
      location,
      radius: 10000, // 10km radius
      maxResults: expandedResultsLimit,
    })

    const filteredPlaces = applyWebsiteFilter(rawPlaces, websiteFilter).slice(0, maxResults)
    const places = await enrichEmails(filteredPlaces, findEmails)

    // Create search record
    const { data: searchRecord, error: searchError } = await supabase
      .from("searches")
      .insert({
        user_id: user.id,
        query,
        location,
        website_filter: websiteFilter,
        email_enrichment_enabled: Boolean(findEmails),
        results_count: places.length,
      })
      .select()
      .single()

    if (searchError) {
      return NextResponse.json({ error: "Failed to create search record" }, { status: 500 })
    }

    // Save leads to database
    const leadsData = places.map((place) => ({
      search_id: searchRecord.id,
      user_id: user.id,
      business_name: place.name,
      address: place.formatted_address,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      rating: place.rating || null,
      total_ratings: place.user_ratings_total || null,
      place_id: place.place_id,
      email: place.email || null,
    }))

    let leadsError = null
    if (leadsData.length > 0) {
      const insertResponse = await supabase.from("leads").insert(leadsData)
      leadsError = insertResponse.error
    }

    if (leadsError) {
      console.error("Failed to save leads:", leadsError)
      return NextResponse.json({ error: "Failed to save leads" }, { status: 500 })
    }

    // Update user quota
    if (!isAdmin) {
      const { error: quotaError } = await supabase
        .from("users")
        .update({ used_quota: userProfile.used_quota + 1 })
        .eq("id", user.id)

      if (quotaError) {
        console.error("Failed to update quota:", quotaError)
      }
    }

    return NextResponse.json({
      searchId: searchRecord.id,
      results: places,
      remainingQuota: isAdmin ? null : userProfile.monthly_quota - userProfile.used_quota - 1,
      isAdmin,
    })
  } catch (error) {
    if (error instanceof GooglePlacesQuotaError) {
      return NextResponse.json(
        {
          error: "Google API quota has been exceeded. Please try again later.",
          code: "GOOGLE_API_QUOTA_EXCEEDED",
        },
        { status: 429 },
      )
    }

    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
