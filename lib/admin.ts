const ADMIN_EMAILS_ENV = "ADMIN_EMAILS"

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function getAdminEmails(): string[] {
  const raw = process.env[ADMIN_EMAILS_ENV]
  if (!raw) {
    return []
  }

  return raw
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean)
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false
  }

  return getAdminEmails().includes(normalizeEmail(email))
}

export const ADMIN_EMAILS_ENV_VAR_NAME = ADMIN_EMAILS_ENV
