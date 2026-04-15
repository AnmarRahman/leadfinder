import { isAdminEmail } from "@/lib/admin"
import { type WebsiteFilter } from "@/lib/search-runner"
import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

const allowedWebsiteFilters: WebsiteFilter[] = ["all", "has-website", "no-website"]

interface RouteContext {
  params: Promise<{ scheduleId: string }>
}

function isWebsiteFilter(value: string): value is WebsiteFilter {
  return allowedWebsiteFilters.includes(value as WebsiteFilter)
}

function parseOptionalDate(value: unknown): string {
  if (value === undefined) {
    throw new Error("Invalid next run date")
  }
  if (value === null || value === "") {
    throw new Error("Invalid next run date")
  }
  const parsed = new Date(String(value))
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid next run date")
  }
  return parsed.toISOString()
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { scheduleId } = await context.params

  try {
    const body = await request.json()

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

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.name !== undefined) {
      const name = String(body.name || "").trim()
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 })
      }
      updates.name = name
    }

    if (body.query !== undefined) {
      const query = String(body.query || "").trim()
      if (!query) {
        return NextResponse.json({ error: "Query cannot be empty" }, { status: 400 })
      }
      updates.query = query
    }

    if (body.location !== undefined) {
      const location = String(body.location || "").trim()
      if (!location) {
        return NextResponse.json({ error: "Location cannot be empty" }, { status: 400 })
      }
      updates.location = location
    }

    if (body.maxResults !== undefined) {
      const maxResults = Number(body.maxResults)
      if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 100) {
        return NextResponse.json({ error: "maxResults must be between 1 and 100" }, { status: 400 })
      }
      updates.max_results = maxResults
    }

    if (body.websiteFilter !== undefined) {
      const websiteFilter = String(body.websiteFilter || "")
      if (!isWebsiteFilter(websiteFilter)) {
        return NextResponse.json({ error: "Invalid website filter" }, { status: 400 })
      }
      if (!canUseAdvancedFilters && websiteFilter !== "all") {
        return NextResponse.json({ error: "Website filtering requires a Pro or Enterprise subscription." }, { status: 403 })
      }
      updates.website_filter = websiteFilter
    }

    if (body.findEmails !== undefined) {
      if (!canUseAdvancedFilters && Boolean(body.findEmails)) {
        return NextResponse.json({ error: "Email enrichment requires a Pro or Enterprise subscription." }, { status: 403 })
      }
      updates.find_emails = Boolean(body.findEmails)
    }

    if (body.enabled !== undefined) {
      updates.enabled = Boolean(body.enabled)
    }

    if (body.nextRunAt !== undefined) {
      updates.next_run_at = parseOptionalDate(body.nextRunAt)
    }

    const { data: schedule, error: updateError } = await supabase
      .from("scheduled_searches")
      .update(updates)
      .eq("id", scheduleId)
      .eq("user_id", user.id)
      .select(
        "id, name, query, location, max_results, website_filter, find_emails, enabled, next_run_at, last_run_at, last_total_results, last_new_results, latest_search_id, created_at, updated_at",
      )
      .single()

    if (updateError || !schedule) {
      return NextResponse.json({ error: "Failed to update scheduled search" }, { status: 500 })
    }

    return NextResponse.json({ schedule })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update scheduled search"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { scheduleId } = await context.params

  const { error } = await supabase.from("scheduled_searches").delete().eq("id", scheduleId).eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to delete scheduled search" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
