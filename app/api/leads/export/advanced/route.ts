import { createRequestClient } from "@/lib/supabase/request"
import { CSVExporter } from "@/lib/csv-export"
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

  const { searchParams } = new URL(request.url)
  const searchId = searchParams.get("searchId")
  const includeRatings = searchParams.get("includeRatings") !== "false"
  const includeSearchInfo = searchParams.get("includeSearchInfo") !== "false"
  const dateFormat = (searchParams.get("dateFormat") as "US" | "ISO" | "EU") || "US"
  const format = searchParams.get("format") || "csv"

  try {
    let query = supabase
      .from("leads")
      .select(
        `
        business_name,
        address,
        phone,
        website,
        rating,
        total_ratings,
        created_at,
        searches!inner(query, location, created_at)
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (searchId) {
      query = query.eq("search_id", searchId)
    }

    const { data: leads, error } = await query

    if (error) {
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 })
    }

    const exporter = new CSVExporter(leads, {
      includeRatings,
      includeSearchInfo,
      dateFormat,
    })

    if (format === "summary") {
      const summary = exporter.generateSummary()
      return NextResponse.json(summary)
    }

    const csvContent = exporter.generateCSV()
    const fileName = exporter.generateFileName(searchId ? `leads-search-${searchId}` : "all-leads")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error("Error exporting leads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
