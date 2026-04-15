import {
  executeScheduledSearch,
  type ExecuteScheduledSearchResult,
  type ScheduledSearchRow,
} from "@/lib/scheduled-search-runner"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return true
  }

  const header = request.headers.get("authorization")
  return header === `Bearer ${cronSecret}`
}

async function runDueScheduledSearches(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()
  const nowIso = new Date().toISOString()

  const { data: dueSchedules, error: dueSchedulesError } = await supabase
    .from("scheduled_searches")
    .select("id, user_id, name, query, location, max_results, website_filter, find_emails, enabled, next_run_at")
    .eq("enabled", true)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(25)

  if (dueSchedulesError) {
    return NextResponse.json({ error: "Failed to fetch due scheduled searches" }, { status: 500 })
  }

  if (!dueSchedules || dueSchedules.length === 0) {
    return NextResponse.json({
      processed: 0,
      succeeded: 0,
      failed: 0,
      runs: [],
    })
  }

  const userIds = [...new Set(dueSchedules.map((schedule) => schedule.user_id))]
  const { data: users, error: usersError } = await supabase.from("users").select("id, email").in("id", userIds)

  if (usersError) {
    return NextResponse.json({ error: "Failed to fetch schedule owners" }, { status: 500 })
  }

  const userEmailById = new Map((users || []).map((user) => [user.id, user.email || null]))
  const runResults: ExecuteScheduledSearchResult[] = []

  for (const schedule of dueSchedules) {
    try {
      const result = await executeScheduledSearch({
        supabase,
        schedule: schedule as ScheduledSearchRow,
        userEmail: userEmailById.get(schedule.user_id) ?? null,
      })
      runResults.push(result)
    } catch (error) {
      runResults.push({
        scheduleId: schedule.id,
        runId: "",
        status: "failed",
        searchId: null,
        totalResults: 0,
        newResults: 0,
        error: error instanceof Error ? error.message : "Unknown scheduled search error",
      })
    }
  }

  const succeeded = runResults.filter((result) => result.status === "success").length
  const failed = runResults.length - succeeded

  return NextResponse.json({
    processed: runResults.length,
    succeeded,
    failed,
    runs: runResults,
  })
}

export async function GET(request: Request) {
  return runDueScheduledSearches(request)
}

export async function POST(request: Request) {
  return runDueScheduledSearches(request)
}
