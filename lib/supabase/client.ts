import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== "undefined" && (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  console.log("[v0] Client - Supabase URL exists:", !!supabaseUrl)
  console.log("[v0] Client - Supabase Key exists:", !!supabaseAnonKey)
  console.log("[v0] Client - Environment:", typeof window !== "undefined" ? "browser" : "server")

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Client - Missing Supabase environment variables")
    console.error("[v0] Client - URL:", supabaseUrl ? "present" : "missing")
    console.error("[v0] Client - Key:", supabaseAnonKey ? "present" : "missing")

    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ error: new Error("Supabase not configured") }),
        signUp: () => Promise.resolve({ error: new Error("Supabase not configured") }),
        signOut: () => Promise.resolve({ error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as any
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
