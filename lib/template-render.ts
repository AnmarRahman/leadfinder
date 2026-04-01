interface LeadTemplateData {
  business_name?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  email?: string | null
}

function normalize(value: string | null | undefined): string {
  return value?.trim() || ""
}

export function renderTemplate(rawTemplate: string, lead: LeadTemplateData): string {
  const replacements: Record<string, string> = {
    business_name: normalize(lead.business_name),
    address: normalize(lead.address),
    phone: normalize(lead.phone),
    website: normalize(lead.website),
    email: normalize(lead.email),
  }

  return rawTemplate.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key: string) => replacements[key] ?? "")
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function toSimpleHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => escapeHtml(line.trim()))
    .join("<br />")
}
