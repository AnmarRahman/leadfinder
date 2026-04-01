import { createRequestClient } from "@/lib/supabase/request"
import { type NextRequest, NextResponse } from "next/server"

interface RouteContext {
  params: Promise<{ templateId: string }>
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

  const { templateId } = await context.params
  const body = await request.json()

  const name = String(body.name || "").trim()
  const subject = String(body.subject || "").trim()
  const templateBody = String(body.body || "").trim()

  if (!name || !subject || !templateBody) {
    return NextResponse.json({ error: "Name, subject, and body are required" }, { status: 400 })
  }

  const { data: template, error } = await supabase
    .from("email_templates")
    .update({
      name,
      subject,
      body: templateBody,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("user_id", user.id)
    .select("id, name, subject, body, created_at, updated_at")
    .single()

  if (error || !template) {
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 })
  }

  return NextResponse.json({ template })
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

  const { templateId } = await context.params

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
