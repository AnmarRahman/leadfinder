import { createClient } from "@/lib/supabase/server"
import { stripe, SUBSCRIPTION_PLANS } from "@/lib/stripe"
import { type NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("Webhook signature verification failed:", error)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const planType = session.metadata?.plan_type

        if (userId && planType && session.subscription) {
          const plan = SUBSCRIPTION_PLANS[planType as keyof typeof SUBSCRIPTION_PLANS]

          await supabase
            .from("users")
            .update({
              subscription_tier: planType,
              monthly_quota: plan.searches,
              stripe_subscription_id: session.subscription as string,
              used_quota: 0, // Reset quota on new subscription
            })
            .eq("id", userId)
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

          await supabase
            .from("users")
            .update({
              subscription_tier: planType,
              monthly_quota: quota,
            })
            .eq("id", user.id)
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
          await supabase
            .from("users")
            .update({
              subscription_tier: "free",
              monthly_quota: 100,
              stripe_subscription_id: null,
            })
            .eq("id", user.id)
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
