"use client";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    }
    fetchUser();

    // Optional: Listen to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <header className="border-b bg-background/95 backdrop-blur flex justify-center items-center flex-col supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between relative">
        {/* Logo */}
        <div className="flex items-center space-x-2 z-10">
          <span className="text-xl font-bold">LeadFinder</span>
        </div>

        {/* Nav - Centered */}
        <nav className="hidden md:flex items-center space-x-6 absolute left-1/2 transform -translate-x-1/2">
          <Link href="/">Home</Link>
          <Link href="/search">Search</Link>
          <Link href="/searches">Searches</Link>
          <Link href="/templates">Templates</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center space-x-4 z-10">
          {user ? (
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
          )}
          <Link href="/pricing">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
