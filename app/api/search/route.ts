import { GooglePlacesService } from "@/lib/google-places"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { query, location, maxResults = 20 } = await request.json()

    if (!query || !location) {
      return NextResponse.json({ error: "Query and location are required" }, { status: 400 })
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

    const maxAllowedResults = tierLimits[userProfile.subscription_tier as keyof typeof tierLimits] || 20

    if (maxResults < 1 || maxResults > maxAllowedResults) {
      return NextResponse.json(
        {
          error: `maxResults must be between 1 and ${maxAllowedResults} for ${userProfile.subscription_tier} tier`,
        },
        { status: 400 },
      )
    }

    if (userProfile.used_quota >= userProfile.monthly_quota) {
      return NextResponse.json({ error: "Monthly quota exceeded" }, { status: 429 })
    }

    // Initialize Google Places service
    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!googleApiKey) {
      return NextResponse.json({ error: "Google Places API key not configured" }, { status: 500 })
    }

    const placesService = new GooglePlacesService(googleApiKey)

    // Search for places
    const places = await placesService.searchPlaces({
      query,
      location,
      radius: 10000, // 10km radius
      maxResults,
    })

    // Create search record
    const { data: searchRecord, error: searchError } = await supabase
      .from("searches")
      .insert({
        user_id: user.id,
        query,
        location,
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
    }))

    const { error: leadsError } = await supabase.from("leads").insert(leadsData)

    if (leadsError) {
      console.error("Failed to save leads:", leadsError)
      return NextResponse.json({ error: "Failed to save leads" }, { status: 500 })
    }

    // Update user quota
    const { error: quotaError } = await supabase
      .from("users")
      .update({ used_quota: userProfile.used_quota + 1 })
      .eq("id", user.id)

    if (quotaError) {
      console.error("Failed to update quota:", quotaError)
    }

    return NextResponse.json({
      searchId: searchRecord.id,
      results: places,
      remainingQuota: userProfile.monthly_quota - userProfile.used_quota - 1,
    })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
