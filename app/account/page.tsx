import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"

async function handlePortalRedirect() {
  "use server"

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/stripe/create-portal-session`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  )

  if (response.ok) {
    const { url } = await response.json()
    redirect(url)
  }
}

async function syncSubscription() {
  "use server"

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/user/sync-subscription`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    },
  )

  if (response.ok) {
    // Redirect to refresh the page data
    redirect("/account")
  }
}

export default async function AccountPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Account Settings</h1>
            <p className="text-muted-foreground">Manage your account and subscription</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Account Created</p>
                <p className="text-sm text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium">User ID</p>
                <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Info */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Current Plan</p>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={profile?.subscription_tier === "free" ? "secondary" : "default"}
                    className="capitalize"
                  >
                    {profile?.subscription_tier || "Free"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Monthly Quota</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.used_quota || 0} / {profile?.monthly_quota || 100} searches used
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/pricing">Change Plan</Link>
                </Button>
                <form action={syncSubscription}>
                  <Button type="submit" variant="outline" size="sm">
                    Refresh Status
                  </Button>
                </form>
                {profile?.stripe_customer_id && (
                  <form action={handlePortalRedirect}>
                    <Button type="submit" variant="outline" size="sm">
                      Manage Billing
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Stats */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Your LeadFinder activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 border rounded">
                <p className="text-2xl font-bold">{profile?.used_quota || 0}</p>
                <p className="text-sm text-muted-foreground">Searches This Month</p>
              </div>
              <div className="text-center p-4 border rounded">
                <p className="text-2xl font-bold">
                  {(profile?.monthly_quota || 100) - (profile?.used_quota || 0)}
                </p>
                <p className="text-sm text-muted-foreground">Searches Remaining</p>
              </div>
              <div className="text-center p-4 border rounded">
                <p className="text-2xl font-bold">
                  {Math.round(((profile?.used_quota || 0) / (profile?.monthly_quota || 100)) * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">Quota Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
