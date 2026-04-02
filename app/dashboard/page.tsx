import { ExportDialog } from "@/components/export-dialog"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isAdminEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const isAdmin = isAdminEmail(user.email)

  // Get user profile and recent searches
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  const { data: recentSearches } = await supabase
    .from("searches")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  const { data: totalLeads, count: leadsCount } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="min-h-screen flex items-center justify-center">
        <div className="container p-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user.email}</p>
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="outline" type="submit">
                Sign Out
              </Button>
            </form>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Quota</CardTitle>
                <CardDescription>Search usage this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {profile?.used_quota || 0} / {profile?.monthly_quota || 100}
                </div>
                <p className="text-sm text-muted-foreground">
                  {(profile?.monthly_quota || 100) - (profile?.used_quota || 0)} searches remaining
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Total Leads</CardTitle>
                <CardDescription>Leads found all time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leadsCount || 0}</div>
                <p className="text-sm text-muted-foreground">Business contacts collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Current plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{profile?.subscription_tier || "Free"}</div>
                <Button asChild className="mt-2" size="sm">
                  <Link href="/pricing">Upgrade Plan</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Searches</CardTitle>
                <CardDescription>Your latest lead searches</CardDescription>
              </CardHeader>
              <CardContent>
                {recentSearches && recentSearches.length > 0 ? (
                  <div className="space-y-3">
                    {recentSearches.map((search) => (
                      <div key={search.id} className="flex justify-between items-center p-3 border rounded">
                        <div>
                          <p className="font-medium">{search.query}</p>
                          <p className="text-sm text-muted-foreground">{search.location}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{search.results_count} results</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(search.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No searches yet. Run your first search from the web app.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Manage your leads and account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/search">Run New Search</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/searches">Saved Searches</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/templates">Email Templates</Link>
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent">
                  <Link href="/leads">All Leads</Link>
                </Button>
                {isAdmin && (
                  <Button asChild variant="outline" className="w-full bg-transparent">
                    <Link href="/admin">Admin User Manager</Link>
                  </Button>
                )}
                <ExportDialog triggerText="Export All Leads to CSV" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
