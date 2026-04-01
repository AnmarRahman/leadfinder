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

  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("id, name, subject, body, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 })
  }

  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const supabase = await createRequestClient(request)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const body = await request.json()
  const name = String(body.name || "").trim()
  const subject = String(body.subject || "").trim()
  const templateBody = String(body.body || "").trim()

  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: "Name, subject, and body are required" }, { status: 400 })
  }

  const { data: template, error } = await supabase
    .from("email_templates")
    .insert({
      user_id: user.id,
      name,
      subject,
      body: templateBody,
    })
    .select("id, name, subject, body, created_at, updated_at")
    .single()

  if (error) {
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 })
  }

  return NextResponse.json({ template })
}
