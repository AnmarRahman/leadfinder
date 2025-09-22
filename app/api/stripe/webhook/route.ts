import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  console.log("[v0] Webhook received")

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log("[v0] Webhook event type:", event.type)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  let supabase
  try {
    supabase = await createClient()
    console.log("[v0] Supabase client created successfully")
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planType = session.metadata?.plan_type

        console.log("[v0] Checkout session completed:", {
          userId,
          planType,
          subscription: session.subscription,
          metadata: session.metadata,
        })

        if (userId && planType && session.subscription) {
          const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]

          console.log("[v0] Updating user subscription:", {
            userId,
            planType,
            searches: plan.searches,
            subscriptionId: session.subscription,
          })

          const { data, error } = await supabase
            .from("users")
            .update({
              subscription_tier: planType,
              monthly_quota: plan.searches,
              stripe_subscription_id: session.subscription as string,
              used_quota: 0, // Reset quota on new subscription
            })
            .eq("id", userId)

          if (error) {
            console.error("[v0] Failed to update user subscription:", error)
          } else {
            console.log("[v0] Successfully updated user subscription:", data)
          }
        } else {
          console.log("[v0] Missing required metadata:", { userId, planType, subscription: session.subscription })
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: user } = await supabase.from("users").select("id").eq("stripe_customer_id", customerId).single()

        if (user) {
          // Determine plan type based on subscription status
          let planType = "free"
          let quota = 100

          if (subscription.status === "active") {
            // Get the price ID to determine plan
            const priceId = subscription.items.data[0]?.price.id

            if (priceId === SUBSCRIPTION_PLANS.pro.priceId) {
              planType = "pro"
              quota = SUBSCRIPTION_PLANS.pro.searches
            } else if (priceId === SUBSCRIPTION_PLANS.enterprise.priceId) {
              planType = "enterprise"
              quota = SUBSCRIPTION_PLANS.enterprise.searches
            }
          }

          console.log("[v0] Updating user subscription status:", {
            userId: user.id,
            planType,
            quota,
          })

          const { data, error } = await supabase
            .from("users")
            .update({
              subscription_tier: planType,
              monthly_quota: quota,
            })
            .eq("id", user.id)

          if (error) {
            console.error("[v0] Failed to update user subscription status:", error)
          } else {
            console.log("[v0] Successfully updated user subscription status:", data)
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const { data: user } = await supabase.from("users").select("id").eq("stripe_customer_id", customerId).single()

        if (user) {
          // Downgrade to free plan
          console.log("[v0] Downgrading user to free plan:", {
            userId: user.id,
          })

          const { data, error } = await supabase
            .from("users")
            .update({
              subscription_tier: "free",
              monthly_quota: 10, // Updated from 100 to 10 searches for free tier
              stripe_subscription_id: null,
            })
            .eq("id", user.id)

          if (error) {
            console.error("[v0] Failed to downgrade user to free plan:", error)
          } else {
            console.log("[v0] Successfully downgraded user to free plan:", data)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
