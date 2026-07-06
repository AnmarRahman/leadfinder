import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[app] Middleware - Supabase URL exists:", !!supabaseUrl)
  console.log("[app] Middleware - Supabase Key exists:", !!supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[app] Missing Supabase environment variables in middleware")
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    console.log("[app] Middleware - User authenticated:", !!user)

    const publicApiRoutes = ["/api/auth", "/api/user/profile"]
    const isPublicApiRoute = publicApiRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    if (request.nextUrl.pathname.startsWith("/api/") && !isPublicApiRoute && !user) {
      console.log("[app] Middleware - Blocking unauthenticated API request:", request.nextUrl.pathname)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return supabaseResponse
  } catch (error) {
    console.error("[app] Middleware error:", error)
    return supabaseResponse
  }
}
