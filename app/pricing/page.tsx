"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { useState } from "react"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const plans = [
  {
    name: "Free",
    price: 0,
    searches: 100,
    features: ["100 searches per month", "Basic lead data", "CSV export"],
    popular: false,
    planType: "free",
  },
  {
    name: "Pro",
    price: 29,
    searches: 1000,
    features: ["1,000 searches per month", "Enhanced lead data", "CSV export", "Priority support"],
    popular: true,
    planType: "pro",
  },
  {
    name: "Enterprise",
    price: 99,
    searches: 5000,
    features: [
      "5,000 searches per month",
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

  const handleSubscribe = async (planType: string) => {
    if (planType === "free") return

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
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">Find more leads with our powerful business search tools</p>
      </div>

      <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <Card key={plan.name} className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2" variant="default">
                Most Popular
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
                disabled={loading === plan.planType || plan.planType === "free"}
              >
                {loading === plan.planType
                  ? "Loading..."
                  : plan.planType === "free"
                    ? "Current Plan"
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
