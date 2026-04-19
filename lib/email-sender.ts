interface SendEmailInput {
  to: string
  subject: string
  html: string
}

type EmailProvider = "gmail" | "resend"

export interface SendEmailResult {
  provider: EmailProvider
  providerMessageId: string | null
}

interface GmailTokenState {
  accessToken: string
  expiresAt: number
}

let cachedGmailToken: GmailTokenState | null = null

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim()
}

function toBase64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function detectProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.toLowerCase()
  if (configured === "gmail" || configured === "resend") {
    return configured
  }

  const hasGmailConfig = Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_SENDER_EMAIL,
  )

  if (hasGmailConfig) {
    return "gmail"
  }

  return "resend"
}

async function getGmailAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedGmailToken && now < cachedGmailToken.expiresAt - 60_000) {
    return cachedGmailToken.accessToken
  }

  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Gmail sender is not configured. Missing GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, or GMAIL_REFRESH_TOKEN.")
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  const tokenPayload = await tokenResponse.json()
  if (!tokenResponse.ok || !tokenPayload.access_token) {
    throw new Error(
      `Failed to refresh Gmail access token (${tokenResponse.status}): ${JSON.stringify(tokenPayload)}`,
    )
  }

  const expiresInSeconds = Number(tokenPayload.expires_in || 3600)
  cachedGmailToken = {
    accessToken: String(tokenPayload.access_token),
    expiresAt: now + expiresInSeconds * 1000,
  }

  return cachedGmailToken.accessToken
}

async function sendViaGmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const senderEmail = process.env.GMAIL_SENDER_EMAIL
  const replyTo = process.env.GMAIL_REPLY_TO

  if (!senderEmail) {
    throw new Error("Gmail sender is not configured. Missing GMAIL_SENDER_EMAIL.")
  }

  const safeTo = sanitizeHeaderValue(to)
  const safeSubject = sanitizeHeaderValue(subject)
  const safeFrom = sanitizeHeaderValue(senderEmail)

  const headers = [
    `From: ${safeFrom}`,
    `To: ${safeTo}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
  ]

  if (replyTo) {
    headers.splice(3, 0, `Reply-To: ${sanitizeHeaderValue(replyTo)}`)
  }

  const rawMessage = `${headers.join("\r\n")}\r\n\r\n${html}`
  const accessToken = await getGmailAccessToken()

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      raw: toBase64Url(rawMessage),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Gmail API error (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as { id?: string }
  return {
    provider: "gmail",
    providerMessageId: payload.id || null,
  }
}

async function sendViaResend({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  if (!fromEmail) {
    throw new Error("RESEND_FROM_EMAIL is not configured")
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend API error (${response.status}): ${body}`)
  }

  const payload = (await response.json()) as { id?: string }
  return {
    provider: "resend",
    providerMessageId: payload.id || null,
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const provider = detectProvider()
  if (provider === "gmail") {
    return sendViaGmail(input)
  }

  return sendViaResend(input)
}
