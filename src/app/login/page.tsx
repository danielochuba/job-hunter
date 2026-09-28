"use client";

import { Crosshair, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/primitives";
import { supabase } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    router.replace(next);
    router.refresh();
  }

  async function magicLink() {
    if (!email) return toast.error("Enter your email first");
    setLoading(true);
    const { error } = await supabase().auth.signInWithOtp({
      email, options: { emailRedirectTo: `${window.location.origin}${next}`, shouldCreateUser: false },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  return (
    <Card className="w-full max-w-sm p-6 shadow-lg shadow-primary/5">
      {sent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Mail className="size-8 text-primary" />
          <p className="font-medium">Check your inbox</p>
          <p className="text-sm text-muted-foreground">We sent a sign-in link to {email}.</p>
        </div>
      ) : (
        <form onSubmit={signIn} className="flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" loading={loading} disabled={!password}>Sign in</Button>
          <div className="relative text-center text-xs text-muted-foreground">
            <span className="relative z-10 bg-card px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          </div>
          <Button type="button" variant="outline" onClick={magicLink} disabled={loading}>
            <Mail /> Email me a magic link
          </Button>
        </form>
      )}
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]" />
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Crosshair className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">JobHunter</h1>
        <p className="max-w-xs text-sm text-muted-foreground">Find the roles worth your time, and apply with documents tailored to each one.</p>
      </div>
      <React.Suspense>
        <LoginForm />
      </React.Suspense>
    </main>
  );
}
