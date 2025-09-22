"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { loadStripe } from "@stripe/stripe-js"
import { Check } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const plans = [
  {
    name: "Free",
    price: 0,
    searches: 10,
    maxResults: 20,
    features: ["10 searches per month", "Up to 20 results per search", "Basic lead data", "CSV export"],
    popular: false,
    planType: "free",
  },
  {
    name: "Pro",
    price: 120,
    searches: 1000,
    maxResults: 50,
    features: [
      "1,000 searches per month",
      "Up to 50 results per search",
      "Enhanced lead data",
      "CSV export",
      "Priority support",
    ],
    popular: true,
    planType: "pro",
  },
  {
    name: "Enterprise",
    price: 1350,
    searches: 5000,
    maxResults: 100,
    features: [
      "5,000 searches per month",
      "Up to 100 results per search",
      "Premium lead data",
      "CSV export",
      "Priority support",
      "API access",
      "Custom integrations",
    ],
    popular: false,
    planType: "enterprise",
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string>("free")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const fetchUserSubscription = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          setIsAuthenticated(true)
          const { data: profile } = await supabase.from("users").select("subscription_tier").eq("id", user.id).single()

          if (profile) {
            setCurrentPlan(profile.subscription_tier || "free")
          }
        }
      } catch (error) {
        console.error("Error fetching user subscription:", error)
      }
    }

    fetchUserSubscription()
  }, [])

  const handleSubscribe = async (planType: string) => {
    if (planType === "free" && currentPlan !== "free") {
      try {
        const response = await fetch("/api/user/downgrade-to-free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (response.ok) {
          setCurrentPlan("free")
          alert("Successfully downgraded to free plan")
          return
        }
      } catch (error) {
        console.error("Error downgrading:", error)
        alert("Failed to downgrade. Please try again.")
        return
      }
    }

    if (planType === "free" || planType === currentPlan) return

    setLoading(planType)

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType }),
      })

      const { sessionId } = await response.json()

      if (!response.ok) {
        throw new Error("Failed to create checkout session")
      }

      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId })
    } catch (error) {
      console.error("Error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="text-center flex-1">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">Find more leads with our powerful business search tools</p>
          {isAuthenticated && (
            <p className="text-sm text-muted-foreground mt-2">
              Current plan: <span className="font-semibold capitalize">{currentPlan}</span>
            </p>
          )}
        </div>
        {isAuthenticated && (
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2" variant="default">
                Most Popular
              </Badge>
            )}
            {isAuthenticated && plan.planType === currentPlan && (
              <Badge className="absolute -top-3 right-4" variant="secondary">
                Current Plan
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription>
                <span className="text-3xl font-bold">${plan.price}</span>
                {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-lg font-semibold">{plan.searches.toLocaleString()} searches/month</p>
                <p className="text-lg font-semibold">Up to {plan.maxResults} results per search</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.planType)}
                disabled={loading === plan.planType || (isAuthenticated && plan.planType === currentPlan)}
              >
                {loading === plan.planType
                  ? "Loading..."
                  : isAuthenticated && plan.planType === currentPlan
                    ? "Current Plan"
                    : plan.planType === "free"
                      ? "Downgrade to Free"
                      : `Subscribe to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-muted-foreground">
          All plans include secure data handling, regular updates, and access to our Chrome extension.
        </p>
      </div>
    </div>
  )
}
