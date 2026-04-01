import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{ leadId: string }>
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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

  const { leadId } = await context.params
  const body = await request.json()

  const email = String(body.email || "").trim().toLowerCase()
  if (email && !isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .update({
      email: email || null,
    })
    .eq("id", leadId)
    .eq("user_id", user.id)
    .select("id, email")
    .single()

  if (error || !lead) {
    return NextResponse.json({ error: "Failed to update lead email" }, { status: 500 })
  }

  return NextResponse.json({ lead })
}
