import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExportDialog } from "@/components/export-dialog"
import Link from "next/link"

export default async function LeadsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  // Get all leads with search information
  const { data: leads } = await supabase
    .from("leads")
    .select(
      `
      *,
      searches!inner(query, location, created_at)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">All Leads</h1>
          <p className="text-muted-foreground">Manage your collected business leads</p>
        </div>
        <div className="flex gap-2">
          <ExportDialog triggerText="Export All Leads" />
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>

      {leads && leads.length > 0 ? (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{lead.business_name}</CardTitle>
                    <CardDescription>{lead.address}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{lead.searches.query}</Badge>
                    <ExportDialog searchId={lead.search_id} triggerText="Export" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  {lead.phone && (
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    </div>
                  )}
                  {lead.website && (
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Visit Site
                      </a>
                    </div>
                  )}
                  {lead.rating && (
                    <div>
                      <p className="text-sm font-medium">Rating</p>
                      <p className="text-sm text-muted-foreground">
                        ⭐ {lead.rating} ({lead.total_ratings || 0} reviews)
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Found</p>
                    <p className="text-sm text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    Search: {lead.searches.query} in {lead.searches.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">No leads found yet</h3>
            <p className="text-muted-foreground mb-4">
              Use the LeadFinder Chrome extension to start collecting business leads.
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
