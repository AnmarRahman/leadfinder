import { isAdminEmail } from "@/lib/admin"
import { createRequestClient } from "@/lib/supabase/request"
import { createAdminClient } from "@/lib/supabase/admin"
import { type NextRequest, NextResponse } from "next/server"

type SubscriptionTier = "free" | "pro" | "enterprise"

const DEFAULT_QUOTA_BY_TIER: Record<SubscriptionTier, number> = {
  free: 10,
  pro: 1000,
  enterprise: 5000,
}

function parseOptionalInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return null
  }

  return parsed
}

async function requireAdmin(request: NextRequest) {
  const supabase = await createRequestClient(request)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }

  if (!isAdminEmail(user.email)) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) }
  }

  return { user }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) {
    return auth.error
  }

  const supabaseAdmin = createAdminClient()
  const { searchParams } = new URL(request.url)
  const emailQuery = searchParams.get("email")?.trim()
  const limitParam = searchParams.get("limit")
  const limit = Math.min(50, Math.max(1, Number(limitParam || 10)))

  let query = supabaseAdmin
    .from("users")
    .select("id, email, subscription_tier, monthly_quota, used_quota, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (emailQuery) {
    query = query.ilike("email", `%${emailQuery}%`)
  }

  const { data: users, error } = await query
  if (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }

  return NextResponse.json({ users })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (auth.error) {
    return auth.error
  }

  const body = await request.json()
  const email = String(body.email || "").trim().toLowerCase()
  const subscriptionTier = String(body.subscriptionTier || "").trim() as SubscriptionTier
  const monthlyQuotaInput = parseOptionalInt(body.monthlyQuota)
  const usedQuotaInput = parseOptionalInt(body.usedQuota)

  if (!email) {
    return NextResponse.json({ error: "User email is required" }, { status: 400 })
  }

  if (!["free", "pro", "enterprise"].includes(subscriptionTier)) {
    return NextResponse.json({ error: "Valid subscription tier is required" }, { status: 400 })
  }

  const monthlyQuota = monthlyQuotaInput ?? DEFAULT_QUOTA_BY_TIER[subscriptionTier]
  const usedQuota = usedQuotaInput ?? 0

  if (usedQuota > monthlyQuota) {
    return NextResponse.json({ error: "usedQuota cannot exceed monthlyQuota" }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()

  const { data: updatedUsers, error } = await supabaseAdmin
    .from("users")
    .update({
      subscription_tier: subscriptionTier,
      monthly_quota: monthlyQuota,
      used_quota: usedQuota,
      updated_at: new Date().toISOString(),
    })
    .eq("email", email)
    .select("id, email, subscription_tier, monthly_quota, used_quota, created_at, updated_at")

  if (error) {
    return NextResponse.json({ error: "Failed to update user tier" }, { status: 500 })
  }

  if (!updatedUsers || updatedUsers.length === 0) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 })
  }

  return NextResponse.json({ users: updatedUsers })
}
