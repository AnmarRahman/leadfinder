import { createRequestClient } from "@/lib/supabase/request"
import { isAdminEmail } from "@/lib/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createRequestClient(request)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const isAdmin = isAdminEmail(user.email)

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("monthly_quota, used_quota, subscription_tier")
    .eq("id", user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 })
  }

  return NextResponse.json({
    monthlyQuota: isAdmin ? null : userProfile.monthly_quota,
    usedQuota: isAdmin ? 0 : userProfile.used_quota,
    remainingQuota: isAdmin ? null : userProfile.monthly_quota - userProfile.used_quota,
    subscriptionTier: isAdmin ? "enterprise" : userProfile.subscription_tier,
    isAdmin,
    unlimited: isAdmin,
  })
}
