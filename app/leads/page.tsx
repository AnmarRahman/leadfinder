"use client"

import { ExportDialog } from "@/components/export-dialog"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Filter } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Lead {
  id: string
  business_name: string
  address: string
  phone: string | null
  website: string | null
  rating: number | null
  total_ratings: number | null
  created_at: string
  search_id: string
  searches: {
    query: string
    location: string
    created_at: string
  }
}

interface UserProfile {
  subscription_tier: string
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [websiteFilter, setWebsiteFilter] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        // Get user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) {
          window.location.href = "/auth/login"
          return
        }

        // Get user profile
        const { data: profile } = await supabase.from("users").select("subscription_tier").eq("id", user.id).single()

        setUserProfile(profile)

        // Get all leads with search information
        const { data: leadsData } = await supabase
          .from("leads")
          .select(`
            *,
            searches!inner(query, location, created_at)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (leadsData) {
          setLeads(leadsData)
          setFilteredLeads(leadsData)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    // Apply website filter
    let filtered = leads

    if (websiteFilter === "no-website") {
      filtered = leads.filter((lead) => !lead.website)
    } else if (websiteFilter === "has-website") {
      filtered = leads.filter((lead) => lead.website)
    }

    setFilteredLeads(filtered)
  }, [leads, websiteFilter])

  const isPro = userProfile?.subscription_tier === "pro" || userProfile?.subscription_tier === "enterprise"

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="min-h-screen flex items-center justify-center">
        <div className="container  p-6">
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

          <div className="mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filter by website:</span>
              </div>
              <Select value={websiteFilter} onValueChange={setWebsiteFilter} disabled={!isPro}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All businesses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All businesses</SelectItem>
                  <SelectItem value="no-website">No website only</SelectItem>
                  <SelectItem value="has-website">Has website only</SelectItem>
                </SelectContent>
              </Select>
              {!isPro && (
                <Badge variant="outline" className="text-xs">
                  Pro feature
                </Badge>
              )}
            </div>
            {!isPro && (
              <p className="text-xs text-muted-foreground mt-2">
                Upgrade to Pro to filter businesses by website status.{" "}
                <Link href="/pricing" className="text-blue-600 hover:underline">
                  Upgrade now
                </Link>
              </p>
            )}
          </div>

          {filteredLeads && filteredLeads.length > 0 ? (
            <div className="grid gap-4">
              <div className="text-sm text-muted-foreground mb-4">
                Showing {filteredLeads.length} of {leads.length} leads
                {websiteFilter === "no-website" && " without websites"}
                {websiteFilter === "has-website" && " with websites"}
              </div>

              {filteredLeads.map((lead) => (
                <Card key={lead.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{lead.business_name}</CardTitle>
                        <CardDescription>{lead.address}</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">{lead.searches.query}</Badge>
                        {!lead.website && (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            No Website
                          </Badge>
                        )}
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
                      {lead.website ? (
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
                      ) : (
                        <div>
                          <p className="text-sm font-medium">Website</p>
                          <p className="text-sm text-muted-foreground">No website</p>
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
                <h3 className="text-lg font-medium mb-2">
                  {leads.length === 0 ? "No leads found yet" : "No leads match your filter"}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {leads.length === 0
                    ? "Use the LeadFinder Chrome extension to start collecting business leads."
                    : "Try adjusting your filter settings to see more results."}
                </p>
                <Button asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
