import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  console.log("[v0] Creating checkout session")

  let supabase
  try {
    supabase = await createClient()
    console.log("[v0] Supabase client created successfully")
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.log("[v0] Authentication failed:", authError)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  console.log("[v0] User authenticated:", user.id)

  try {
    const { planType } = await request.json()

    if (!planType || !["pro", "enterprise"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan type" }, { status: 400 })
    }

    const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]

    console.log("[v0] Plan selected:", planType)
    console.log("[v0] Plan config:", plan)
    console.log("[v0] Environment variables:", {
      STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID,
      STRIPE_ENTERPRISE_PRICE_ID: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    })

    if (!plan.priceId) {
      return NextResponse.json(
        {
          error: `Price ID not configured for ${planType} plan. Please set STRIPE_${planType.toUpperCase()}_PRICE_ID environment variable.`,
        },
        { status: 500 },
      )
    }

    // Get or create Stripe customer
    const { data: userProfile } = await supabase.from("users").select("stripe_customer_id").eq("id", user.id).single()

    let customerId = userProfile?.stripe_customer_id

    if (!customerId) {
      console.log("[v0] Creating new Stripe customer")
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
      console.log("[v0] Created Stripe customer:", customerId)

      // Update user with Stripe customer ID
      await supabase.from("users").update({ stripe_customer_id: customerId }).eq("id", user.id)
    } else {
      console.log("[v0] Using existing Stripe customer:", customerId)
    }

    // Create checkout session
    console.log("[v0] Creating checkout session with metadata:", {
      supabase_user_id: user.id,
      plan_type: planType,
    })

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/pricing?canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        plan_type: planType,
      },
    })

    console.log("[v0] Checkout session created:", session.id)
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
