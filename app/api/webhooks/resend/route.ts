import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"
import { Webhook } from "svix"

type SupportedResendEventType =
  | "email.delivered"
  | "email.bounced"
  | "email.failed"
  | "email.complained"
  | "email.opened"
  | "email.clicked"
  | "email.delivery_delayed"

interface ResendWebhookEvent {
  type: string
  created_at?: string
  data?: {
    email_id?: string
    created_at?: string
    error?: string
    bounce?: {
      message?: string
      type?: string
      subType?: string
    }
  }
}

function mapEventTypeToDeliveryStatus(eventType: SupportedResendEventType) {
  switch (eventType) {
    case "email.delivered":
      return "delivered"
    case "email.bounced":
      return "bounced"
    case "email.failed":
      return "failed"
    case "email.complained":
      return "complained"
    case "email.opened":
      return "opened"
    case "email.clicked":
      return "clicked"
    case "email.delivery_delayed":
      return "delivery_delayed"
    default:
      return null
  }
}

function extractErrorMessage(event: ResendWebhookEvent): string | null {
  if (event.type === "email.bounced") {
    const bounce = event.data?.bounce
    const messageParts = [bounce?.type, bounce?.subType, bounce?.message].filter(Boolean)
    if (messageParts.length > 0) {
      return messageParts.join(" | ")
    }
  }

  if (typeof event.data?.error === "string" && event.data.error.trim()) {
    return event.data.error.trim()
  }

  return null
}

function toValidIsoDate(value: string | undefined, fallbackIso: string): string {
  if (!value) {
    return fallbackIso
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallbackIso
  }

  return parsed.toISOString()
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET is not configured" }, { status: 500 })
  }

  const svixId = request.headers.get("svix-id")
  const svixTimestamp = request.headers.get("svix-timestamp")
  const svixSignature = request.headers.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 400 })
  }

  const rawPayload = await request.text()

  let event: ResendWebhookEvent
  try {
    const wh = new Webhook(webhookSecret)
    event = wh.verify(rawPayload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookEvent
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 })
  }

  const supportedEventTypes: SupportedResendEventType[] = [
    "email.delivered",
    "email.bounced",
    "email.failed",
    "email.complained",
    "email.opened",
    "email.clicked",
    "email.delivery_delayed",
  ]

  if (!supportedEventTypes.includes(event.type as SupportedResendEventType)) {
    return NextResponse.json({ ignored: true })
  }

  const deliveryStatus = mapEventTypeToDeliveryStatus(event.type as SupportedResendEventType)
  const providerMessageId = event.data?.email_id

  if (!deliveryStatus || !providerMessageId) {
    return NextResponse.json({ ignored: true })
  }

  const eventIso = toValidIsoDate(event.data?.created_at || event.created_at, new Date().toISOString())
  const deliveryError = extractErrorMessage(event)

  const supabase = createAdminClient()
  const { error: updateError } = await supabase
    .from("email_sends")
    .update({
      delivery_status: deliveryStatus,
      delivery_event_at: eventIso,
      delivery_error: deliveryError,
      error_message:
        deliveryStatus === "failed" || deliveryStatus === "bounced"
          ? deliveryError || "Email delivery failed"
          : null,
    })
    .eq("provider", "resend")
    .eq("provider_message_id", providerMessageId)

  if (updateError) {
    console.error("Failed to update email delivery status from webhook:", updateError)
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
