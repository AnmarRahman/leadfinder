import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting subscription sync")

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      console.log("[v0] Auth error:", authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("stripe_customer_id, subscription_tier")
      .eq("id", user.id)
      .single()

    if (profileError || !profile) {
      console.log("[v0] Profile error:", profileError)
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    console.log("[v0] Current profile:", profile)

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer ID found" }, { status: 400 })
    }

    // Get active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
      limit: 1,
    })

    console.log("[v0] Active subscriptions:", subscriptions.data.length)

    let newTier = "free"
    let newQuota = 100

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0]
      const priceId = subscription.items.data[0]?.price.id

      console.log("[v0] Active subscription price ID:", priceId)

      // Determine tier based on price ID
      if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
        newTier = "pro"
        newQuota = 1000
      } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID) {
        newTier = "enterprise"
        newQuota = 10000
      }
    }

    console.log("[v0] Updating to tier:", newTier, "quota:", newQuota)

    // Update user subscription in database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_tier: newTier,
        monthly_quota: newQuota,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)

    if (updateError) {
      console.log("[v0] Update error:", updateError)
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
    }

    console.log("[v0] Subscription synced successfully")

    return NextResponse.json({
      success: true,
      tier: newTier,
      quota: newQuota,
    })
  } catch (error) {
    console.error("[v0] Sync subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
