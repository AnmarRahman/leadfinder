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
    .select("id, query, location, results_count, website_filter, email_enrichment_enabled, scheduled_search_id, created_at")
    .eq("id", searchId)
    .eq("user_id", user.id)
    .single()

  if (searchError || !search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 })
  }

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, business_name, address, phone, website, email, rating, total_ratings, is_new_in_run, created_at")
    .eq("search_id", searchId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (leadsError) {
    return NextResponse.json({ error: "Failed to fetch leads for this search" }, { status: 500 })
  }

  const leadIds = (leads || []).map((lead) => lead.id)
  let emailSendsByLeadId: Record<
    string,
    {
      send_status: string | null
      delivery_status: string | null
      delivery_error: string | null
      sent_at: string | null
    }
  > = {}

  if (leadIds.length > 0) {
    const enrichedQuery = await supabase
      .from("email_sends")
      .select("lead_id, status, delivery_status, delivery_error, sent_at")
      .eq("user_id", user.id)
      .in("lead_id", leadIds)
      .order("sent_at", { ascending: false })

    let emailSends = enrichedQuery.data
    if (enrichedQuery.error) {
      // Backward compatibility: migration 004 may not be present yet.
      const legacyQuery = await supabase
        .from("email_sends")
        .select("lead_id, status, error_message, sent_at")
        .eq("user_id", user.id)
        .in("lead_id", leadIds)
        .order("sent_at", { ascending: false })

      if (!legacyQuery.error) {
        emailSends = (legacyQuery.data || []).map((row) => ({
          lead_id: row.lead_id,
          status: row.status,
          delivery_status: null,
          delivery_error: row.error_message || null,
          sent_at: row.sent_at,
        }))
      }
    }

    emailSendsByLeadId = (emailSends || []).reduce((acc, row) => {
      const leadId = String(row.lead_id || "")
      if (!leadId || acc[leadId]) {
        return acc
      }

      acc[leadId] = {
        send_status: (row.status as string) || null,
        delivery_status: (row.delivery_status as string) || null,
        delivery_error: (row.delivery_error as string) || null,
        sent_at: (row.sent_at as string) || null,
      }

      return acc
    }, {} as Record<string, { send_status: string | null; delivery_status: string | null; delivery_error: string | null; sent_at: string | null }>)
  }

  const enrichedLeads = (leads || []).map((lead) => {
    const emailSend = emailSendsByLeadId[lead.id]
    return {
      ...lead,
      last_email_send_status: emailSend?.send_status ?? null,
      last_email_delivery_status: emailSend?.delivery_status ?? null,
      last_email_delivery_error: emailSend?.delivery_error ?? null,
      last_email_sent_at: emailSend?.sent_at ?? null,
    }
  })

  return NextResponse.json({ search, leads: enrichedLeads })
}
