import { sendEmail } from "@/lib/email-sender"
import { createRequestClient } from "@/lib/supabase/request"
import { renderTemplate, toSimpleHtml } from "@/lib/template-render"
import { type NextRequest, NextResponse } from "next/server"

interface LeadRecipient {
  id: string
  business_name: string | null
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
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
  const templateId = String(body.templateId || "").trim()
  const searchId = typeof body.searchId === "string" ? body.searchId : null
  const leadIds = Array.isArray(body.leadIds) ? body.leadIds.filter((id: unknown) => typeof id === "string") : []

  if (!templateId) {
    return NextResponse.json({ error: "Template is required" }, { status: 400 })
  }

  if (!searchId && leadIds.length === 0) {
    return NextResponse.json({ error: "Provide searchId or leadIds to define recipients" }, { status: 400 })
  }

  const { data: template, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, subject, body")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single()

  if (templateError || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  let leadsQuery = supabase
    .from("leads")
    .select("id, business_name, address, phone, website, email")
    .eq("user_id", user.id)

  if (searchId) {
    leadsQuery = leadsQuery.eq("search_id", searchId)
  }

  if (leadIds.length > 0) {
    leadsQuery = leadsQuery.in("id", leadIds)
  }

  const { data: leads, error: leadsError } = await leadsQuery

  if (leadsError || !leads) {
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 })
  }

  const recipients = (leads as LeadRecipient[]).filter((lead) => Boolean(lead.email))

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .insert({
      user_id: user.id,
      template_id: template.id,
      search_id: searchId,
      subject: template.subject,
      body: template.body,
      recipients_count: recipients.length,
      status: "sending",
    })
    .select("id")
    .single()

  if (campaignError || !campaign) {
    return NextResponse.json({ error: "Failed to create email campaign" }, { status: 500 })
  }

  if (recipients.length === 0) {
    await supabase
      .from("email_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign.id)

    return NextResponse.json({
      campaignId: campaign.id,
      sent: 0,
      failed: 0,
      skipped: leads.length,
      message: "No recipients with an email address were found.",
    })
  }

  const sendLogRows: Array<{
    campaign_id: string
    user_id: string
    lead_id: string
    recipient_email: string
    status: "sent" | "failed"
    error_message: string | null
    sent_at: string
  }> = []

  let sentCount = 0
  let failedCount = 0

  for (const lead of recipients) {
    const renderedSubject = renderTemplate(template.subject, lead)
    const renderedBody = renderTemplate(template.body, lead)

    try {
      await sendEmail({
        to: lead.email as string,
        subject: renderedSubject,
        html: toSimpleHtml(renderedBody),
      })

      sendLogRows.push({
        campaign_id: campaign.id,
        user_id: user.id,
        lead_id: lead.id,
        recipient_email: lead.email as string,
        status: "sent",
        error_message: null,
        sent_at: new Date().toISOString(),
      })
      sentCount += 1
    } catch (error) {
      sendLogRows.push({
        campaign_id: campaign.id,
        user_id: user.id,
        lead_id: lead.id,
        recipient_email: lead.email as string,
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown send error",
        sent_at: new Date().toISOString(),
      })
      failedCount += 1
    }
  }

  if (sendLogRows.length > 0) {
    await supabase.from("email_sends").insert(sendLogRows)
  }

  await supabase
    .from("email_campaigns")
    .update({
      sent_count: sentCount,
      failed_count: failedCount,
      status: failedCount > 0 && sentCount === 0 ? "failed" : "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaign.id)

  return NextResponse.json({
    campaignId: campaign.id,
    sent: sentCount,
    failed: failedCount,
    skipped: Math.max(0, leads.length - recipients.length),
  })
}
