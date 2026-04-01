"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { useEffect, useState } from "react"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  created_at: string
  updated_at: string
}

const PLACEHOLDER_HINT = "{{business_name}}, {{address}}, {{phone}}, {{website}}, {{email}}"

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [name, setName] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  async function loadTemplates() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/email-templates")
      if (response.status === 401) {
        window.location.href = "/auth/login"
        return
      }
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to load templates")
      }

      setTemplates(data.templates || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load templates")
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setEditingId(null)
    setName("")
    setSubject("")
    setBody("")
  }

  function startEdit(template: EmailTemplate) {
    setEditingId(template.id)
    setName(template.name)
    setSubject(template.subject)
    setBody(template.body)
    setMessage(null)
    setError(null)
  }

  async function saveTemplate() {
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(editingId ? `/api/email-templates/${editingId}` : "/api/email-templates", {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, subject, body }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to save template")
      }

      await loadTemplates()
      resetForm()
      setMessage(editingId ? "Template updated." : "Template created.")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  async function deleteTemplate(id: string) {
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`/api/email-templates/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete template")
      }

      if (editingId === id) {
        resetForm()
      }
      await loadTemplates()
      setMessage("Template deleted.")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete template")
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">Create and save outreach templates for your lead campaigns.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/searches">Back to Searches</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Template" : "Create Template"}</CardTitle>
            <CardDescription>Available placeholders: {PLACEHOLDER_HINT}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input id="template-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-subject">Email Subject</Label>
              <Input id="template-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-body">Email Body</Label>
              <Textarea
                id="template-body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="min-h-40"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveTemplate} disabled={saving || !name || !subject || !body}>
                {saving ? "Saving..." : editingId ? "Update Template" : "Create Template"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
            {message && <p className="text-sm text-green-600">{message}</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Templates</CardTitle>
            <CardDescription>Use these templates from your saved search outreach page.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            ) : templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">{template.subject}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => startEdit(template)}>
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteTemplate(template.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{template.body}</p>
                      <Badge variant="outline">Updated {new Date(template.updated_at).toLocaleString()}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No templates yet. Create your first one above.</p>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
