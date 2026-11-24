"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Local mode (API running with LOCAL_MODE=true): no sign-in, Supabase is never contacted. */
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Supabase is used for sign-in only; all data goes through the FastAPI backend. */
export function supabase() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}

export async function accessToken(): Promise<string | null> {
  if (AUTH_DISABLED) return null;
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? null;
}
