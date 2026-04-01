const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

const BLOCKLIST_SUFFIXES = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
  ".css",
  ".js",
  ".ico",
  ".pdf",
]

const BLOCKLIST_LOCALS = new Set(["example", "test", "noreply", "no-reply"])

function isLikelyBusinessEmail(candidate: string): boolean {
  const lower = candidate.toLowerCase().trim()

  if (!lower || lower.includes("..")) {
    return false
  }

  if (lower.includes("@example.") || lower.endsWith("@example.com")) {
    return false
  }

  for (const suffix of BLOCKLIST_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      return false
    }
  }

  const [localPart] = lower.split("@")
  if (!localPart || BLOCKLIST_LOCALS.has(localPart)) {
    return false
  }

  return true
}

function collectEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX) || []
  const seen = new Set<string>()
  const emails: string[] = []

  for (const match of matches) {
    const email = match.toLowerCase().trim()
    if (seen.has(email) || !isLikelyBusinessEmail(email)) {
      continue
    }
    seen.add(email)
    emails.push(email)
  }

  return emails
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LeadFinderBot/1.0 (+https://leadfinder.app)",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    })

    if (!response.ok) {
      return null
    }

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("text/html")) {
      return null
    }

    return await response.text()
  } catch {
    return null
  }
}

export async function findBusinessEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  let url: URL
  try {
    url = new URL(websiteUrl)
  } catch {
    return null
  }

  const rootUrl = `${url.protocol}//${url.host}`
  const candidates = [websiteUrl, rootUrl, `${rootUrl}/contact`, `${rootUrl}/contact-us`, `${rootUrl}/about`]

  for (const candidateUrl of candidates) {
    const html = await tryFetch(candidateUrl)
    if (!html) {
      continue
    }

    const emails = collectEmails(html)
    if (emails.length > 0) {
      return emails[0]
    }
  }

  return null
}
