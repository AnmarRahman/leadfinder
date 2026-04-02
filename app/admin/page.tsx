"use client"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect, useState } from "react"

interface AdminUser {
  id: string
  email: string
  subscription_tier: "free" | "pro" | "enterprise"
  monthly_quota: number
  used_quota: number
  created_at: string
  updated_at: string
}

interface UserEditDraft {
  subscriptionTier: "free" | "pro" | "enterprise"
  monthlyQuota: string
  usedQuota: string
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [queryEmail, setQueryEmail] = useState("")
  const [users, setUsers] = useState<AdminUser[]>([])
  const [drafts, setDrafts] = useState<Record<string, UserEditDraft>>({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function validateAdminAccess() {
      try {
        const response = await fetch("/api/user/profile")
        if (response.status === 401) {
          window.location.href = "/auth/login"
          return
        }

        const data = await response.json()
        setIsAdmin(Boolean(data?.profile?.is_admin))
      } catch {
        setIsAdmin(false)
      }
    }

    validateAdminAccess()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const emailParam = queryEmail.trim() ? `?email=${encodeURIComponent(queryEmail.trim())}&limit=20` : "?limit=20"
      const response = await fetch(`/api/admin/users${emailParam}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users")
      }

      const fetchedUsers: AdminUser[] = data.users || []
      setUsers(fetchedUsers)
      setDrafts(
        fetchedUsers.reduce(
          (acc, user) => ({
            ...acc,
            [user.id]: {
              subscriptionTier: user.subscription_tier,
              monthlyQuota: String(user.monthly_quota),
              usedQuota: String(user.used_quota),
            },
          }),
          {} as Record<string, UserEditDraft>,
        ),
      )
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (user: AdminUser) => {
    const draft = drafts[user.id]
    if (!draft) {
      return
    }

    setError(null)
    setMessage(null)

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          subscriptionTier: draft.subscriptionTier,
          monthlyQuota: draft.monthlyQuota,
          usedQuota: draft.usedQuota,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to update user")
      }

      setMessage(`Updated ${user.email}`)
      await loadUsers()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update user")
    }
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container p-6">
          <p className="text-muted-foreground">Loading admin tools...</p>
        </main>
        <Footer />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container p-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>This page is only available to root/admin accounts.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Admin User Manager</h1>
          <p className="text-muted-foreground">
            Search users by email, switch plan tiers, and override quota values for testing.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Users</CardTitle>
            <CardDescription>Leave blank to load recent users.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="user@example.com"
                value={queryEmail}
                onChange={(event) => setQueryEmail(event.target.value)}
              />
              <Button onClick={loadUsers} disabled={loading}>
                {loading ? "Loading..." : "Search"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Root/admin access is granted via the `ADMIN_EMAILS` environment variable.
            </p>
          </CardContent>
        </Card>

        {message && <p className="text-sm text-green-600">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="grid gap-4">
          {users.map((user) => {
            const draft = drafts[user.id]
            if (!draft) {
              return null
            }

            return (
              <Card key={user.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{user.email}</CardTitle>
                      <CardDescription>User ID: {user.id}</CardDescription>
                    </div>
                    <Badge variant="outline">Current: {user.subscription_tier}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Tier</Label>
                      <Select
                        value={draft.subscriptionTier}
                        onValueChange={(value: "free" | "pro" | "enterprise") =>
                          setDrafts((previous) => ({
                            ...previous,
                            [user.id]: {
                              ...previous[user.id],
                              subscriptionTier: value,
                            },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">free</SelectItem>
                          <SelectItem value="pro">pro</SelectItem>
                          <SelectItem value="enterprise">enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Monthly Quota</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.monthlyQuota}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [user.id]: {
                              ...previous[user.id],
                              monthlyQuota: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Used Quota</Label>
                      <Input
                        type="number"
                        min={0}
                        value={draft.usedQuota}
                        onChange={(event) =>
                          setDrafts((previous) => ({
                            ...previous,
                            [user.id]: {
                              ...previous[user.id],
                              usedQuota: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={() => updateUser(user)}>Save User Settings</Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
      <Footer />
    </div>
  )
}
