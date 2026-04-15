"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useMemo, useState, useEffect } from "react"

interface SearchRecord {
  id: string
  query: string
  location: string
  results_count: number
  website_filter: string
  email_enrichment_enabled: boolean
  scheduled_search_id: string | null
  created_at: string
}

function startOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T00:00:00`)
}

function endOfDay(dateValue: string): Date {
  return new Date(`${dateValue}T23:59:59.999`)
}

export default function SearchesPage() {
  const [searches, setSearches] = useState<SearchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [keywordFilter, setKeywordFilter] = useState("")
  const [locationFilter, setLocationFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    async function fetchSearches() {
      try {
        const response = await fetch("/api/searches")
        if (response.status === 401) {
          window.location.href = "/auth/login"
          return
        }

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || "Failed to load searches")
        }

        setSearches(data.searches || [])
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load searches")
      } finally {
        setLoading(false)
      }
    }

    fetchSearches()
  }, [])

  const filteredSearches = useMemo(() => {
    return searches.filter((search) => {
      const keywordMatch =
        !keywordFilter.trim() ||
        search.query.toLowerCase().includes(keywordFilter.trim().toLowerCase())

      const locationMatch =
        !locationFilter.trim() ||
        search.location.toLowerCase().includes(locationFilter.trim().toLowerCase())

      let dateMatch = true
      if (dateFilter) {
        const createdAt = new Date(search.created_at)
        dateMatch = createdAt >= startOfDay(dateFilter) && createdAt <= endOfDay(dateFilter)
      }

      return keywordMatch && locationMatch && dateMatch
    })
  }, [searches, keywordFilter, locationFilter, dateFilter])

  const clearFilters = () => {
    setKeywordFilter("")
    setLocationFilter("")
    setDateFilter("")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Saved Searches</h1>
            <p className="text-muted-foreground">Review and filter your previous searches and outreach-ready results.</p>
          </div>
          <Button asChild>
            <Link href="/search">Run New Search</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by keyword, location, and search date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="keyword-filter">Keyword</Label>
                <Input
                  id="keyword-filter"
                  placeholder="dentist, plumber..."
                  value={keywordFilter}
                  onChange={(event) => setKeywordFilter(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-filter">Location</Label>
                <Input
                  id="location-filter"
                  placeholder="Montreal, Miami..."
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-filter">Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filteredSearches.length} of {searches.length} searches
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">Loading searches...</CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="py-10 text-center text-red-500">{error}</CardContent>
          </Card>
        ) : filteredSearches.length > 0 ? (
          <div className="grid gap-4">
            {filteredSearches.map((search) => (
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
                    {search.scheduled_search_id && <Badge variant="secondary">Automation run</Badge>}
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
              <p className="text-muted-foreground mb-3">
                {searches.length === 0 ? "No searches yet." : "No searches match your filters."}
              </p>
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
