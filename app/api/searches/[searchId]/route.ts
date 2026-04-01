import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{ searchId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  const supabase = await createRequestClient(request)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchId } = await context.params

  const { data: search, error: searchError } = await supabase
    .from("searches")
    .select("id, query, location, results_count, website_filter, email_enrichment_enabled, created_at")
    .eq("id", searchId)
    .eq("user_id", user.id)
    .single()

  if (searchError || !search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 })
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, business_name, address, phone, website, email, rating, total_ratings, created_at")
    .eq("search_id", searchId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (leadsError) {
    return NextResponse.json({ error: "Failed to fetch leads for this search" }, { status: 500 })
  }

  return NextResponse.json({ search, leads })
}
