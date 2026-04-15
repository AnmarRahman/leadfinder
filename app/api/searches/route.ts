import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createRequestClient(request)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: searches, error } = await supabase
    .from("searches")
    .select("id, query, location, results_count, website_filter, email_enrichment_enabled, scheduled_search_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch searches" }, { status: 500 })
  }

  return NextResponse.json({ searches })
}
