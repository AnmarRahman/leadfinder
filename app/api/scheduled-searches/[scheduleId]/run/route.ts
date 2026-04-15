import {
  executeScheduledSearch,
  type ScheduledSearchRow,
} from "@/lib/scheduled-search-runner"
import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{ scheduleId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { scheduleId } = await context.params

  const { data: schedule, error: scheduleError } = await supabase
    .from("scheduled_searches")
    .select("id, user_id, name, query, location, max_results, website_filter, find_emails, enabled, next_run_at")
    .eq("id", scheduleId)
    .eq("user_id", user.id)
    .single()

  if (scheduleError || !schedule) {
    return NextResponse.json({ error: "Scheduled search not found" }, { status: 404 })
  }

  if (!schedule.enabled) {
    return NextResponse.json({ error: "Scheduled search is disabled" }, { status: 400 })
  }

  try {
    const result = await executeScheduledSearch({
      supabase,
      schedule: schedule as ScheduledSearchRow,
      userEmail: user.email ?? null,
    })

    if (result.status === "failed") {
      return NextResponse.json({ error: result.error || "Scheduled search run failed", result }, { status: 500 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scheduled search run failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
