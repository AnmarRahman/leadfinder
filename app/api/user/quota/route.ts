import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select("monthly_quota, used_quota, subscription_tier")
    .eq("id", user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 })
  }

  return NextResponse.json({
    monthlyQuota: userProfile.monthly_quota,
    usedQuota: userProfile.used_quota,
    remainingQuota: userProfile.monthly_quota - userProfile.used_quota,
    subscriptionTier: userProfile.subscription_tier,
  })
}
