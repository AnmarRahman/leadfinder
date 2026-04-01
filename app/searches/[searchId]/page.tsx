"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PhoneCall } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

interface SearchInfo {
  id: string
  query: string
  location: string
  results_count: number
  website_filter: string
  email_enrichment_enabled: boolean
  created_at: string
}

interface Lead {
  id: string
  business_name: string
  address: string | null
  phone: string | null
  website: string | null
  email: string | null
  rating: number | null
  total_ratings: number | null
  created_at: string
}

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
}

export default function SearchDetailsPage() {
  const params = useParams<{ searchId: string }>()
  const searchIdParam = params?.searchId
  const searchId = Array.isArray(searchIdParam) ? searchIdParam[0] : searchIdParam || ""
  const [search, setSearch] = useState<SearchInfo | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({})
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null)

  useEffect(() => {
    if (!searchId) {
      return
    }

    async function loadPageData() {
      setLoading(true)
      setError(null)

      try {
        const [searchResponse, templatesResponse] = await Promise.all([
          fetch(`/api/searches/${searchId}`),
          fetch("/api/email-templates"),
        ])

        if (searchResponse.status === 401 || templatesResponse.status === 401) {
          window.location.href = "/auth/login"
          return
        }

        const searchData = await searchResponse.json()
        if (!searchResponse.ok) {
          throw new Error(searchData.error || "Failed to load search")
        }

        const templatesData = await templatesResponse.json()
        if (!templatesResponse.ok) {
          throw new Error(templatesData.error || "Failed to load templates")
        }

        setSearch(searchData.search)
        setLeads(searchData.leads || [])
        setEmailDrafts(
          (searchData.leads || []).reduce((acc: Record<string, string>, lead: Lead) => {
            acc[lead.id] = lead.email || ""
            return acc
          }, {}),
        )

        const loadedTemplates: EmailTemplate[] = templatesData.templates || []
        setTemplates(loadedTemplates)
        if (loadedTemplates.length > 0) {
          setSelectedTemplateId(loadedTemplates[0].id)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load page")
      } finally {
        setLoading(false)
      }
    }

    loadPageData()
  }, [searchId])

  const selectionStats = useMemo(() => {
    const leadsWithEmail = leads.filter((lead) => Boolean(lead.email)).length
    const leadsWithPhone = leads.filter((lead) => Boolean(lead.phone)).length
    return {
      total: leads.length,
      withEmail: leadsWithEmail,
      withPhone: leadsWithPhone,
      selected: selectedLeadIds.length,
    }
  }, [leads, selectedLeadIds.length])

  const toggleLeadSelection = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((previous) =>
      checked ? [...new Set([...previous, leadId])] : previous.filter((id) => id !== leadId),
    )
  }

  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(leads.map((lead) => lead.id))
      return
    }

    setSelectedLeadIds([])
  }

  const handleSendEmails = async (sendSelectedOnly: boolean) => {
    if (!selectedTemplateId) {
      setError("Select an email template before sending.")
      return
    }

    if (sendSelectedOnly && selectedLeadIds.length === 0) {
      setError("Select at least one lead before using 'Send to Selected'.")
      return
    }

    setSending(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/email-campaigns/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          searchId,
          leadIds: sendSelectedOnly ? selectedLeadIds : undefined,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to send emails")
      }

      setMessage(`Campaign complete. Sent: ${data.sent}, failed: ${data.failed}, skipped: ${data.skipped}.`)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Email send failed")
    } finally {
      setSending(false)
    }
  }

  const saveLeadEmail = async (leadId: string) => {
    const email = emailDrafts[leadId] || ""

    setSavingLeadId(leadId)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/leads/${leadId}/email`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to save email")
      }

      setLeads((previous) => previous.map((lead) => (lead.id === leadId ? { ...lead, email: data.lead.email } : lead)))
      setMessage("Lead email updated.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update lead email")
    } finally {
      setSavingLeadId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container p-6">
          <p className="text-muted-foreground">Loading saved search...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!search) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container p-6 space-y-4">
          <p className="text-red-500">{error || "Search not found."}</p>
          <Button asChild>
            <Link href="/searches">Back to Searches</Link>
          </Button>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">
              {search.query} in {search.location}
            </h1>
            <p className="text-muted-foreground">Saved on {new Date(search.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/searches">Back</Link>
            </Button>
            <Button asChild>
              <Link href="/templates">Manage Templates</Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Outreach Summary</CardTitle>
            <CardDescription>Select leads and launch your email campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Total leads: {selectionStats.total}</Badge>
              <Badge variant="secondary">With email: {selectionStats.withEmail}</Badge>
              <Badge variant="secondary">With phone: {selectionStats.withPhone}</Badge>
              <Badge variant="secondary">Selected: {selectionStats.selected}</Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr,auto,auto] items-end">
              <div className="space-y-2">
                <Label>Email Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleSendEmails(true)} disabled={sending}>
                {sending ? "Sending..." : "Send to Selected"}
              </Button>
              <Button onClick={() => handleSendEmails(false)} disabled={sending} variant="outline">
                {sending ? "Sending..." : "Send to All in Search"}
              </Button>
            </div>

            {templates.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-4 text-sm text-muted-foreground">
                  No templates yet. Create one in the Templates page before sending outreach emails.
                </CardContent>
              </Card>
            )}

            {selectedTemplateId && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">Subject: </span>
                    {templates.find((template) => template.id === selectedTemplateId)?.subject}
                  </p>
                  <Textarea
                    value={templates.find((template) => template.id === selectedTemplateId)?.body || ""}
                    readOnly
                    className="min-h-28"
                  />
                </CardContent>
              </Card>
            )}

            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads</CardTitle>
            <CardDescription>Pick leads, edit missing emails, call leads, and send templates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={leads.length > 0 && selectedLeadIds.length === leads.length}
                onCheckedChange={(checked) => selectAll(checked === true)}
              />
              <span className="text-sm">Select all leads</span>
            </div>

            <div className="space-y-3">
              {leads.map((lead) => (
                <Card key={lead.id}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedLeadIds.includes(lead.id)}
                          onCheckedChange={(checked) => toggleLeadSelection(lead.id, checked === true)}
                        />
                        <div>
                          <p className="font-medium">{lead.business_name}</p>
                          <p className="text-sm text-muted-foreground">{lead.address || "No address"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!lead.website && <Badge variant="outline">No website</Badge>}
                        {lead.phone && (
                          <Button asChild size="sm" variant="outline" className="gap-2 bg-transparent">
                            <a href={`tel:${lead.phone}`}>
                              <PhoneCall className="h-4 w-4" />
                              Call
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr,auto]">
                      <Input
                        placeholder="business@email.com"
                        value={emailDrafts[lead.id] || ""}
                        onChange={(event) =>
                          setEmailDrafts((previous) => ({
                            ...previous,
                            [lead.id]: event.target.value,
                          }))
                        }
                      />
                      <Button onClick={() => saveLeadEmail(lead.id)} disabled={savingLeadId === lead.id} variant="outline">
                        {savingLeadId === lead.id ? "Saving..." : "Save Email"}
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                      <span>{lead.phone || "No phone"}</span>
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          Website
                        </a>
                      ) : (
                        <span>No website</span>
                      )}
                      <span>{lead.email || "No email"}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
