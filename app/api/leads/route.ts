import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const searchId = searchParams.get("searchId")
  const page = Number.parseInt(searchParams.get("page") || "1")
  const limit = Number.parseInt(searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from("leads")
      .select(
        `
        *,
        searches!inner(query, location, created_at)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (searchId) {
      query = query.eq("search_id", searchId)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase.from("leads").select("*", { count: "exact", head: true }).eq("user_id", user.id)

    if (searchId) {
      countQuery = countQuery.eq("search_id", searchId)
    }

    const { count } = await countQuery

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching leads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
