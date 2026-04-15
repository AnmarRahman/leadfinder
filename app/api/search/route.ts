import { GooglePlacesQuotaError } from "@/lib/google-places"
import { runLeadSearch, SearchRunError, type WebsiteFilter } from "@/lib/search-runner"
import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

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

    const runResult = await runLeadSearch({
      supabase,
      userId: user.id,
      userEmail: user.email,
      query,
      location,
      maxResults,
      websiteFilter,
      findEmails,
    })

    return NextResponse.json({
      searchId: runResult.searchId,
      results: runResult.results,
      remainingQuota: runResult.remainingQuota,
      isAdmin: runResult.isAdmin,
    })
  } catch (error) {
    if (error instanceof SearchRunError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      )
    }

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
