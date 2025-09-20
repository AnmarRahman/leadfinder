import Stripe from "stripe"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
})

export const SUBSCRIPTION_PLANS = {
  free: {
    name: "Free",
    price: 0,
    searches: 10, // Reduced from 50 to 10 searches to further lower costs ($0.32 vs $1.60)
    features: ["10 searches per month", "Basic lead data", "CSV export"],
  },
  pro: {
    name: "Pro",
    price: 120, // Updated to profitable pricing
    searches: 1000,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ["1,000 searches per month", "Enhanced lead data", "CSV export", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    price: 1350, // Updated to profitable pricing
    searches: 5000,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      "5,000 searches per month",
      "Premium lead data",
      "CSV export",
      "Priority support",
      "API access",
      "Custom integrations",
    ],
  },
}
