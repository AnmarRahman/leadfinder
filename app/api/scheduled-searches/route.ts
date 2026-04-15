import { isAdminEmail } from "@/lib/admin"
import { type WebsiteFilter } from "@/lib/search-runner"
import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

const DEFAULT_RESULTS_LIMIT = 20
const DEFAULT_FIRST_DELAY_MINUTES = 5

const allowedWebsiteFilters: WebsiteFilter[] = ["all", "has-website", "no-website"]

function isWebsiteFilter(value: string): value is WebsiteFilter {
  return allowedWebsiteFilters.includes(value as WebsiteFilter)
}

function parseNextRunAt(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid next run date")
    }
    return parsed.toISOString()
  }

  return new Date(Date.now() + DEFAULT_FIRST_DELAY_MINUTES * 60_000).toISOString()
}

export async function GET(request: NextRequest) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: schedules, error: scheduleError } = await supabase
    .from("scheduled_searches")
    .select(
      "id, name, query, location, max_results, website_filter, find_emails, enabled, next_run_at, last_run_at, last_total_results, last_new_results, latest_search_id, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (scheduleError) {
    return NextResponse.json({ error: "Failed to fetch scheduled searches" }, { status: 500 })
  }

  const scheduleIds = (schedules || []).map((schedule) => schedule.id)
  let runsByScheduleId: Record<string, Array<Record<string, unknown>>> = {}

  if (scheduleIds.length > 0) {
    const { data: runs, error: runsError } = await supabase
      .from("scheduled_search_runs")
      .select("id, scheduled_search_id, search_id, run_started_at, run_finished_at, total_results, new_results, status, error_message")
      .eq("user_id", user.id)
      .in("scheduled_search_id", scheduleIds)
      .order("run_started_at", { ascending: false })

    if (runsError) {
      return NextResponse.json({ error: "Failed to fetch scheduled search runs" }, { status: 500 })
    }

    runsByScheduleId = (runs || []).reduce<Record<string, Array<Record<string, unknown>>>>((acc, run) => {
      const scheduledSearchId = String(run.scheduled_search_id)
      if (!acc[scheduledSearchId]) {
        acc[scheduledSearchId] = []
      }
      if (acc[scheduledSearchId].length < 10) {
        acc[scheduledSearchId].push(run as Record<string, unknown>)
      }
      return acc
    }, {})
  }

  const response = (schedules || []).map((schedule) => ({
    ...schedule,
    runs: runsByScheduleId[schedule.id] || [],
  }))

  return NextResponse.json({ schedules: response })
}

export async function POST(request: NextRequest) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const query = String(body.query || "").trim()
    const location = String(body.location || "").trim()
    const name = String(body.name || `${query} in ${location}` || "").trim()
    const maxResults = Number(body.maxResults ?? DEFAULT_RESULTS_LIMIT)
    const websiteFilter = String(body.websiteFilter || "all")
    const findEmails = Boolean(body.findEmails)
    const enabled = body.enabled === undefined ? true : Boolean(body.enabled)
    const nextRunAtIso = parseNextRunAt(body.nextRunAt)

    if (!query || !location || !name) {
      return NextResponse.json({ error: "Name, query, and location are required" }, { status: 400 })
    }

    if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
      return NextResponse.json({ error: "maxResults must be between 1 and 100" }, { status: 400 })
    }

    if (!isWebsiteFilter(websiteFilter)) {
      return NextResponse.json({ error: "Invalid website filter" }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    const isAdmin = isAdminEmail(user.email)
    const canUseAdvancedFilters = isAdmin || profile.subscription_tier === "pro" || profile.subscription_tier === "enterprise"
    if (!canUseAdvancedFilters && websiteFilter !== "all") {
      return NextResponse.json({ error: "Website filtering requires a Pro or Enterprise subscription." }, { status: 403 })
    }
    if (!canUseAdvancedFilters && findEmails) {
      return NextResponse.json({ error: "Email enrichment requires a Pro or Enterprise subscription." }, { status: 403 })
    }

    const { data: schedule, error: insertError } = await supabase
      .from("scheduled_searches")
      .insert({
        user_id: user.id,
        name,
        query,
        location,
        max_results: maxResults,
        website_filter: websiteFilter,
        find_emails: findEmails,
        enabled,
        next_run_at: nextRunAtIso,
      })
      .select(
        "id, name, query, location, max_results, website_filter, find_emails, enabled, next_run_at, last_run_at, last_total_results, last_new_results, latest_search_id, created_at, updated_at",
      )
      .single()

    if (insertError || !schedule) {
      return NextResponse.json({ error: "Failed to create scheduled search" }, { status: 500 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create scheduled search"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
