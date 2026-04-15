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
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"

type WebsiteFilter = "all" | "has-website" | "no-website"

interface UserProfileResponse {
  profile: {
    subscription_tier: "free" | "pro" | "enterprise"
    is_admin: boolean
  }
}

interface ScheduledSearchRun {
  id: string
  search_id: string | null
  run_started_at: string
  run_finished_at: string | null
  total_results: number
  new_results: number
  status: "success" | "failed"
  error_message: string | null
}

interface ScheduledSearch {
  id: string
  name: string
  query: string
  location: string
  max_results: number
  website_filter: WebsiteFilter
  find_emails: boolean
  enabled: boolean
  next_run_at: string
  last_run_at: string | null
  last_total_results: number
  last_new_results: number
  latest_search_id: string | null
  runs: ScheduledSearchRun[]
}

interface ScheduledSearchesResponse {
  schedules: ScheduledSearch[]
}

function toDatetimeLocalValue(input: Date): string {
  const year = input.getFullYear()
  const month = String(input.getMonth() + 1).padStart(2, "0")
  const day = String(input.getDate()).padStart(2, "0")
  const hours = String(input.getHours()).padStart(2, "0")
  const minutes = String(input.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function createDefaultNextRunDate(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)
  return toDatetimeLocalValue(now)
}

export default function AutomationsPage() {
  const [schedules, setSchedules] = useState<ScheduledSearch[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null)
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<UserProfileResponse["profile"] | null>(null)

  const [name, setName] = useState("")
  const [query, setQuery] = useState("")
  const [location, setLocation] = useState("")
  const [maxResults, setMaxResults] = useState(20)
  const [websiteFilter, setWebsiteFilter] = useState<WebsiteFilter>("all")
  const [findEmails, setFindEmails] = useState(false)
  const [nextRunAt, setNextRunAt] = useState(createDefaultNextRunDate)

  const advancedEnabled = useMemo(
    () => profile?.is_admin || profile?.subscription_tier === "pro" || profile?.subscription_tier === "enterprise",
    [profile],
  )

  const loadSchedules = useCallback(async () => {
    try {
      const response = await fetch("/api/scheduled-searches")
      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }
      const data = (await response.json()) as ScheduledSearchesResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || "Failed to load scheduled searches")
      }
      setSchedules(data.schedules || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load scheduled searches")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/user/profile")
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as UserProfileResponse
        setProfile(data.profile)
      } catch {
        setProfile(null)
      }
    }

    loadProfile()
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    if (!advancedEnabled) {
      setWebsiteFilter("all")
      setFindEmails(false)
    }
  }, [advancedEnabled])

  const resetForm = () => {
    setName("")
    setQuery("")
    setLocation("")
    setMaxResults(20)
    setWebsiteFilter("all")
    setFindEmails(false)
    setNextRunAt(createDefaultNextRunDate())
  }

  const handleCreateSchedule = async () => {
    setCreating(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch("/api/scheduled-searches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          query,
          location,
          maxResults,
          websiteFilter,
          findEmails,
          nextRunAt: new Date(nextRunAt).toISOString(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create scheduled search")
      }

      setMessage("Weekly automation created.")
      resetForm()
      await loadSchedules()
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create scheduled search")
    } finally {
      setCreating(false)
    }
  }

  const handleRunNow = async (scheduleId: string) => {
    setRunningScheduleId(scheduleId)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`/api/scheduled-searches/${scheduleId}/run`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to run scheduled search")
      }
      setMessage("Scheduled search run completed.")
      await loadSchedules()
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Failed to run scheduled search")
    } finally {
      setRunningScheduleId(null)
    }
  }

  const handleToggleEnabled = async (schedule: ScheduledSearch, enabled: boolean) => {
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/scheduled-searches/${schedule.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to update schedule")
      }

      setSchedules((previous) => previous.map((item) => (item.id === schedule.id ? { ...item, enabled } : item)))
      setMessage(enabled ? "Automation enabled." : "Automation paused.")
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Failed to update schedule")
    }
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    setDeletingScheduleId(scheduleId)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch(`/api/scheduled-searches/${scheduleId}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete schedule")
      }
      setSchedules((previous) => previous.filter((schedule) => schedule.id !== scheduleId))
      setMessage("Automation deleted.")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete schedule")
    } finally {
      setDeletingScheduleId(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Weekly Automations</h1>
            <p className="text-muted-foreground">
              Set recurring searches, detect newly discovered businesses, and open each run as a saved search.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/searches">View Saved Searches</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Weekly Search</CardTitle>
            <CardDescription>
              This search runs every 7 days from the next run time and tracks how many results are new.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-name">Automation Name</Label>
                <Input
                  id="schedule-name"
                  placeholder="Dentists in Montreal weekly"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-next-run">First Run Time</Label>
                <Input
                  id="schedule-next-run"
                  type="datetime-local"
                  value={nextRunAt}
                  onChange={(event) => setNextRunAt(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schedule-query">Keyword</Label>
                <Input
                  id="schedule-query"
                  placeholder="dentist, plumber..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="schedule-location">Location</Label>
                <Input
                  id="schedule-location"
                  placeholder="Montreal, QC"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="schedule-max-results">Max Results</Label>
                <Input
                  id="schedule-max-results"
                  type="number"
                  min={1}
                  max={100}
                  value={maxResults}
                  onChange={(event) => setMaxResults(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Website Filter</Label>
                <Select value={websiteFilter} onValueChange={(value: WebsiteFilter) => setWebsiteFilter(value)} disabled={!advancedEnabled}>
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
                  <p className="text-xs text-muted-foreground">Upgrade to Pro to enable website filtering.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Email Enrichment</Label>
                <div className="flex items-center justify-between border rounded-md px-3 py-2">
                  <span className="text-sm">Try finding emails</span>
                  <Switch checked={findEmails} onCheckedChange={setFindEmails} disabled={!advancedEnabled} />
                </div>
                {!advancedEnabled && (
                  <p className="text-xs text-muted-foreground">Upgrade to Pro to enable email enrichment.</p>
                )}
              </div>
            </div>

            <Button onClick={handleCreateSchedule} disabled={creating || !query || !location}>
              {creating ? "Creating..." : "Create Weekly Automation"}
            </Button>
          </CardContent>
        </Card>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle>Scheduled Searches</CardTitle>
            <CardDescription>Run now, pause, or open the latest saved result set from each automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading automations...</p>
            ) : schedules.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No automations yet. Create your first weekly search above.
                </CardContent>
              </Card>
            ) : (
              schedules.map((schedule) => (
                <Card key={schedule.id}>
                  <CardContent className="py-4 space-y-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold">{schedule.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schedule.query} in {schedule.location}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={schedule.enabled ? "secondary" : "outline"}>
                            {schedule.enabled ? "Active" : "Paused"}
                          </Badge>
                          <Badge variant="outline">Max {schedule.max_results}</Badge>
                          {schedule.website_filter !== "all" && <Badge variant="outline">{schedule.website_filter}</Badge>}
                          {schedule.find_emails && <Badge variant="outline">Email enrichment</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">Enabled</Label>
                          <Switch
                            checked={schedule.enabled}
                            onCheckedChange={(enabled) => handleToggleEnabled(schedule, enabled)}
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => handleRunNow(schedule.id)}
                          disabled={runningScheduleId === schedule.id || !schedule.enabled}
                        >
                          {runningScheduleId === schedule.id ? "Running..." : "Run Now"}
                        </Button>
                        {schedule.latest_search_id && (
                          <Button asChild variant="outline">
                            <Link href={`/searches/${schedule.latest_search_id}`}>Open Latest</Link>
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={deletingScheduleId === schedule.id}
                        >
                          {deletingScheduleId === schedule.id ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-4 text-sm">
                      <p>
                        <span className="font-medium">Next run:</span>{" "}
                        {schedule.next_run_at ? new Date(schedule.next_run_at).toLocaleString() : "Not scheduled"}
                      </p>
                      <p>
                        <span className="font-medium">Last run:</span>{" "}
                        {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : "Never"}
                      </p>
                      <p>
                        <span className="font-medium">Last total:</span> {schedule.last_total_results || 0}
                      </p>
                      <p>
                        <span className="font-medium">Last new:</span> {schedule.last_new_results || 0}
                      </p>
                    </div>

                    {schedule.runs.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Recent Runs</p>
                        <div className="space-y-2">
                          {schedule.runs.slice(0, 5).map((run) => (
                            <div
                              key={run.id}
                              className="flex items-center justify-between rounded border px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant={run.status === "success" ? "secondary" : "destructive"}>
                                  {run.status}
                                </Badge>
                                <span>{new Date(run.run_started_at).toLocaleString()}</span>
                                <span>
                                  {run.total_results} total / {run.new_results} new
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {run.search_id && (
                                  <Button asChild size="sm" variant="outline">
                                    <Link href={`/searches/${run.search_id}`}>Open</Link>
                                  </Button>
                                )}
                                {run.error_message && (
                                  <span className="text-red-500 max-w-md truncate" title={run.error_message}>
                                    {run.error_message}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
