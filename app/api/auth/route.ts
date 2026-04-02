import { createClient } from "@/lib/supabase/server"
import { createRequestClient } from "@/lib/supabase/request"
import { isAdminEmail } from "@/lib/admin"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Auth API called")
    const { email, password, action } = await request.json()
    console.log("[v0] Action:", action, "Email:", email)

    const supabase = await createClient()
    console.log("[v0] Supabase client created")

    if (action === "signup") {
      console.log("[v0] Processing signup")
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard`,
        },
      })

      console.log("[v0] Signup result:", { data: !!data, error: error?.message })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ data })
    }

    if (action === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ data })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Auth API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createRequestClient(request)

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const isAdmin = isAdminEmail(user.email)

  // Get user profile data
  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  return NextResponse.json({
    user,
    profile: profile
      ? {
          ...profile,
          subscription_tier: isAdmin ? "enterprise" : profile.subscription_tier,
          is_admin: isAdmin,
        }
      : null,
  })
}
