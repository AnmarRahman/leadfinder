import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Downgrade to free endpoint called")

    const supabase = await createClient()

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("[v0] User not authenticated:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Downgrading user to free:", user.id)

    // Update user subscription to free tier
    const { data, error } = await supabase
      .from("users")
      .update({
        subscription_tier: "free",
        monthly_quota: 10,
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select()

    if (error) {
      console.error("[v0] Error updating user subscription:", error)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    console.log("[v0] Successfully downgraded user to free:", data)

    return NextResponse.json({
      success: true,
      message: "Successfully downgraded to free plan",
      user: data[0],
    })
  } catch (error) {
    console.error("[v0] Error in downgrade endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
