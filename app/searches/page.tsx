import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function SearchesPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  const { data: searches } = await supabase
    .from("searches")
    .select("id, query, location, results_count, website_filter, email_enrichment_enabled, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saved Searches</h1>
            <p className="text-muted-foreground">Review your previous searches and launch outreach.</p>
          </div>
          <Button asChild>
            <Link href="/search">Run New Search</Link>
          </Button>
        </div>

        {searches && searches.length > 0 ? (
          <div className="grid gap-4">
            {searches.map((search) => (
              <Card key={search.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{search.query}</CardTitle>
                      <CardDescription>{search.location}</CardDescription>
                    </div>
                    <Badge variant="secondary">{search.results_count} leads</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 items-center justify-between">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge variant="outline">Filter: {search.website_filter || "all"}</Badge>
                    {search.email_enrichment_enabled && <Badge variant="outline">Email enrichment on</Badge>}
                    <span>Created {new Date(search.created_at).toLocaleString()}</span>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/searches/${search.id}`}>Open Search</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-muted-foreground mb-3">No searches yet.</p>
              <Button asChild>
                <Link href="/search">Run your first search</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}
