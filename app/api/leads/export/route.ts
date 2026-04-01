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

  const { searchParams } = new URL(request.url)
  const searchId = searchParams.get("searchId")

  try {
    let query = supabase
      .from("leads")
      .select(
        `business_name,
        address,
        phone,
        website,
        rating,
        total_ratings,
        created_at,
        searches!inner(query, location)
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

    // Generate CSV content
    const csvHeaders = [
      "Business Name",
      "Address",
      "Phone",
      "Website",
      "Rating",
      "Total Ratings",
      "Search Query",
      "Search Location",
      "Date Found",
    ]

    const csvRows = leads.map((lead) => [
      `"${lead.business_name.replace(/"/g, '""')}"`,
      `"${lead.address?.replace(/"/g, '""') || ""}"`,
      `"${lead.phone || ""}"`,
      `"${lead.website || ""}"`,
      lead.rating || "",
      lead.total_ratings || "",
      `"${lead.searches[0]?.query?.replace(/"/g, '""') || ""}"`,
      `"${lead.searches[0]?.location?.replace(/"/g, '""') || ""}"`,
      new Date(lead.created_at).toLocaleDateString(),
    ])

    const csvContent = [csvHeaders.join(","), ...csvRows.map((row) => row.join(","))].join("\n")

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting leads:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
