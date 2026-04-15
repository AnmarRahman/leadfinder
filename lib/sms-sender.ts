interface SendSmsInput {
  to: string
  body: string
}

function sanitizePhoneNumber(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("00")) {
    return `+${trimmed.slice(2).replace(/[^\d]/g, "")}`
  }
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/[^\d]/g, "")}`
  }
  return trimmed.replace(/[^\d]/g, "")
}

export async function sendSms({ to, body }: SendSmsInput): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio SMS is not configured. Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_NUMBER.")
  }

  const sanitizedTo = sanitizePhoneNumber(to)
  if (!sanitizedTo) {
    throw new Error("Recipient phone number is invalid.")
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const payload = new URLSearchParams({
    To: sanitizedTo,
    From: fromNumber,
    Body: body,
  })

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  })

  if (!response.ok) {
    const responseBody = await response.text()
    throw new Error(`Twilio API error (${response.status}): ${responseBody}`)
  }
}
