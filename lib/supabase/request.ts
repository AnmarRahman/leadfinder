import { createClient as createRawClient } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"

import { createClient as createCookieClient } from "@/lib/supabase/server"

function readBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")
  if (!authHeader) {
    return null
  }

  if (!authHeader.startsWith("Bearer ")) {
    return null
  }

  return authHeader.slice("Bearer ".length).trim() || null
}

export async function createRequestClient(request: NextRequest) {
  const bearerToken = readBearerToken(request)

  if (!bearerToken) {
    return createCookieClient()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured")
  }

  return createRawClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
