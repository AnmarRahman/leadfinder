"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { PhoneCall, Search } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

interface SearchResult {
  place_id: string
  name: string
  formatted_address: string
  formatted_phone_number?: string
  website?: string
  email?: string
  rating?: number
  user_ratings_total?: number
}

interface UserProfile {
  subscription_tier: "free" | "pro" | "enterprise"
}

const tierResultLimits = {
  free: 20,
  pro: 50,
  enterprise: 100,
}

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [maxResults, setMaxResults] = useState(20)
  const [websiteFilter, setWebsiteFilter] = useState<"all" | "has-website" | "no-website">("all")
  const [findEmails, setFindEmails] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searchId, setSearchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/user/profile")
        if (response.status === 401) {
          window.location.href = "/auth/login"
          return
        }
        if (!response.ok) {
          return
        }

        const data = await response.json()
        setProfile(data.profile)
      } catch {
        setProfile(null)
      }
    }

    loadProfile()
  }, [])

  const currentTier = profile?.subscription_tier || "free"
  const maxTierResults = tierResultLimits[currentTier]
  const advancedEnabled = currentTier !== "free"

  useEffect(() => {
    if (maxResults > maxTierResults) {
      setMaxResults(maxTierResults)
    }
  }, [maxResults, maxTierResults])

  useEffect(() => {
    if (!advancedEnabled) {
      setWebsiteFilter("all")
      setFindEmails(false)
    }
  }, [advancedEnabled])

  const resultStats = useMemo(() => {
    const withWebsite = results.filter((result) => Boolean(result.website)).length
    const withoutWebsite = results.length - withWebsite
    const withEmail = results.filter((result) => Boolean(result.email)).length

    return { withWebsite, withoutWebsite, withEmail }
  }, [results])

  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    setResults([])
    setSearchId(null)

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          location,
          maxResults: Math.max(1, Math.min(maxTierResults, maxResults)),
          websiteFilter,
          findEmails,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Search failed")
      }

      setResults(data.results || [])
      setSearchId(data.searchId)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Run Lead Search</h1>
          <p className="text-muted-foreground">
            Search Google Maps businesses, save the results, and launch outreach from your saved search.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Settings</CardTitle>
            <CardDescription>Enter your business keyword and location to find new leads.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="query">Keyword</Label>
                <Input
                  id="query"
                  placeholder="plumber, dentist, landscaper..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Miami, FL"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="max-results">Max Results (1-{maxTierResults})</Label>
                <Input
                  id="max-results"
                  type="number"
                  min={1}
                  max={maxTierResults}
                  value={maxResults}
                  onChange={(event) => {
                    const value = Number(event.target.value)
                    if (Number.isNaN(value)) {
                      setMaxResults(1)
                      return
                    }
                    setMaxResults(value)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Website Filter</Label>
                <Select
                  value={websiteFilter}
                  onValueChange={(value: "all" | "has-website" | "no-website") => setWebsiteFilter(value)}
                  disabled={!advancedEnabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All businesses</SelectItem>
                    <SelectItem value="no-website">No website only</SelectItem>
                    <SelectItem value="has-website">Has website only</SelectItem>
                  </SelectContent>
                </Select>
                {!advancedEnabled && (
                  <p className="text-xs text-muted-foreground">Upgrade to Pro to use website filtering.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email Enrichment</Label>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span className="text-sm">Try finding emails on websites</span>
                  <Switch checked={findEmails} onCheckedChange={setFindEmails} disabled={!advancedEnabled} />
                </div>
                {!advancedEnabled && (
                  <p className="text-xs text-muted-foreground">Upgrade to Pro to enable email enrichment.</p>
                )}
              </div>
            </div>

            <Button onClick={handleSearch} disabled={loading || !query || !location} className="gap-2">
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Run Search"}
            </Button>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>{results.length} leads were saved to your account.</CardDescription>
                </div>
                {searchId && (
                  <Button asChild>
                    <Link href={`/searches/${searchId}`}>Open Saved Search</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">With website: {resultStats.withWebsite}</Badge>
                <Badge variant="secondary">No website: {resultStats.withoutWebsite}</Badge>
                <Badge variant="secondary">With email: {resultStats.withEmail}</Badge>
              </div>

              <div className="grid gap-4">
                {results.map((result) => (
                  <Card key={result.place_id}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{result.name}</p>
                          <p className="text-sm text-muted-foreground">{result.formatted_address}</p>
                        </div>
                        {!result.website && <Badge variant="outline">No website</Badge>}
                      </div>
                      <div className="grid gap-2 md:grid-cols-3 text-sm">
                        <p>{result.formatted_phone_number || "No phone found"}</p>
                        <p>{result.email || "No email found"}</p>
                        {result.website ? (
                          <a href={result.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                            Visit website
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No website</span>
                        )}
                      </div>
                      {result.formatted_phone_number && (
                        <Button asChild variant="outline" size="sm" className="gap-2 bg-transparent">
                          <a href={`tel:${result.formatted_phone_number}`}>
                            <PhoneCall className="h-4 w-4" />
                            Call
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  )
}
