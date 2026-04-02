import { createRequestClient } from "@/lib/supabase/request"
import { isAdminEmail } from "@/lib/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const supabase = await createRequestClient(request)

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const isAdmin = isAdminEmail(user.email)

  try {
    // Get user profile with subscription tier
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("subscription_tier, monthly_quota, used_quota")
      .eq("id", user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 })
    }

    return NextResponse.json({
      profile: {
        subscription_tier: isAdmin ? "enterprise" : profile.subscription_tier,
        monthly_quota: isAdmin ? null : profile.monthly_quota,
        used_quota: isAdmin ? 0 : profile.used_quota,
        is_admin: isAdmin,
      },
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
