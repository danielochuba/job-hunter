"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Crosshair, Mail, Rocket } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ChipInput } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/overlays";
import { Card, Field, Input, Skeleton } from "@/components/ui/primitives";
import { ReviewParsed, UploadZone } from "@/features/cv/upload";
import { useAutosave } from "@/features/profile/use-autosave";
import { api } from "@/lib/api/client";
import { keys, useCVs, useGmail, useMe } from "@/lib/api/hooks";
import type { ParsedCV, UserProfile } from "@/lib/api/types";
import { REGIONS, useRoleSuggestions } from "@/lib/suggestions";
import { cn } from "@/lib/utils";

const STEPS = ["You", "Your CV", "What you want", "Where to look", "Email", "Go"];

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: cvs } = useCVs();
  const { data: gmail } = useGmail();
  const { draft, update, flush } = useAutosave<UserProfile>(me, "/me");
  const [step, setStep] = React.useState(0);
  const [parsed, setParsed] = React.useState<ParsedCV | null>(null);
  const [queries, setQueries] = React.useState<string[]>([]);
  const [companyUrl, setCompanyUrl] = React.useState("");
  const [finishing, setFinishing] = React.useState(false);
  const roleSuggestions = useRoleSuggestions();

  const next = async () => { await flush(); setStep((s) => Math.min(STEPS.length - 1, s + 1)); };
  const finish = async (collect: boolean) => {
    setFinishing(true);
    try {
      await flush();
      if (queries.length) await api.put("/settings", { search_queries: queries });
      await api.put("/me", { onboarded: true });
      if (collect) await api.post("/runs/collect");
      await qc.invalidateQueries({ queryKey: keys.me });
      toast.success(collect ? "You're set! Collecting your first jobs…" : "You're set!");
      router.replace("/");
    } catch (e) { toast.error((e as Error).message); setFinishing(false); }
  };
  const addCompany = async () => {
    if (!companyUrl) return;
    try {
      const c = await api.post<{ token: string }>("/companies", { url: companyUrl });
      toast.success(`Watching ${c.token}`);
      setCompanyUrl("");
    } catch (e) { toast.error((e as Error).message); }
  };

  if (!draft) return <div className="mx-auto max-w-2xl p-8"><Skeleton className="h-96 rounded-xl" /></div>;
  const p = draft;
  const canNext = [p.first_name && p.last_name && p.country, (cvs?.length ?? 0) > 0, true, true, true, true][step];

  return (
    <main className="relative min-h-screen px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_oklch,var(--primary)_14%,transparent),transparent)]" />
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Crosshair className="size-4" /></span> JobHunter</div>
          <button className="cursor-pointer text-xs text-muted-foreground hover:text-foreground" onClick={() => finish(false)}>Skip setup</button>
        </div>
        <ol className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 flex-col gap-1.5">
              <div className={cn("h-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
              <span className={cn("hidden text-[11px] sm:block", i === step ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {step === 0 && (
              <Card className="flex flex-col gap-5 p-6">
                <div><h1 className="text-xl font-semibold">Welcome{p.first_name ? `, ${p.first_name}` : ""}! Let&apos;s set you up.</h1>
                  <p className="text-sm text-muted-foreground">A few basics for your CVs and emails. You can change everything later.</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name"><Input value={p.first_name} onChange={(e) => update("first_name", e.target.value)} autoFocus /></Field>
                  <Field label="Last name"><Input value={p.last_name} onChange={(e) => update("last_name", e.target.value)} /></Field>
                  <Field label="City"><Input value={p.city ?? ""} onChange={(e) => update("city", e.target.value)} /></Field>
                  <Field label="Country"><Input value={p.country ?? ""} onChange={(e) => update("country", e.target.value)} /></Field>
                  <Field label="Headline" className="sm:col-span-2"><Input value={p.headline ?? ""} onChange={(e) => update("headline", e.target.value)} placeholder="Backend Engineer · Python/Django & Node" /></Field>
                </div>
              </Card>
            )}
            {step === 1 && (
              <div className="flex flex-col gap-4">
                <div><h1 className="text-xl font-semibold">Upload your CV</h1>
                  <p className="text-sm text-muted-foreground">Put everything in it, even things you&apos;d normally cut. Tailoring only ever selects and rephrases from this.</p></div>
                {parsed ? <ReviewParsed parsed={parsed} onCancel={() => setParsed(null)} onDone={() => { setParsed(null); next(); }} />
                  : cvs?.length ? (
                    <Card className="flex items-center gap-3 p-5"><Check className="size-5 text-success" /> <span className="text-sm">You have {cvs.length} CV{cvs.length > 1 ? "s" : ""} saved.</span>
                      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setParsed(null)}>Upload another below</Button></Card>
                  ) : null}
                {!parsed && <UploadZone onParsed={setParsed} compact={!!cvs?.length} />}
              </div>
            )}
            {step === 2 && (
              <Card className="flex flex-col gap-5 p-6">
                <div><h1 className="text-xl font-semibold">What are you looking for?</h1>
                  <p className="text-sm text-muted-foreground">This decides what gets searched, and what gets filtered out before it wastes your time.</p></div>
                <Field label="Target roles" hint="Pick as many as you like">
                  <ChipInput value={p.target_roles} onChange={(v) => update("target_roles", v)} suggestions={roleSuggestions}
                    placeholder="Type a role and press Enter, or pick below" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Seniority">
                    <Select value={p.seniority ?? undefined} placeholder="Any" onValueChange={(v) => update("seniority", v)}
                      options={["junior", "mid", "senior", "staff"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }))} />
                  </Field>
                  <Field label="Acceptable regions for remote"><ChipInput value={p.acceptable_regions} onChange={(v) => update("acceptable_regions", v)} suggestions={REGIONS} maxSuggestions={6} placeholder="EMEA, Worldwide…" /></Field>
                </div>
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>I need visa sponsorship</span><Switch checked={p.needs_sponsorship} onCheckedChange={(v) => update("needs_sponsorship", v)} /></label>
                <label className="flex items-center justify-between rounded-lg border p-3 text-sm"><span>Remote only</span><Switch checked={p.remote_only} onCheckedChange={(v) => update("remote_only", v)} /></label>
              </Card>
            )}
            {step === 3 && (
              <Card className="flex flex-col gap-5 p-6">
                <div><h1 className="text-xl font-semibold">Where should we look?</h1>
                  <p className="text-sm text-muted-foreground">Seven public job boards are on by default. Add keywords, and any companies you&apos;d love to work for.</p></div>
                <Field label="Search keywords" hint="Leave empty to use your target roles"><ChipInput value={queries} onChange={setQueries} placeholder="python, django, fastapi…" /></Field>
                <Field label="Companies you're watching (careers page URL)">
                  <div className="flex gap-2">
                    <Input type="url" placeholder="https://jobs.ashbyhq.com/acme" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} />
                    <Button variant="outline" onClick={addCompany}>Add</Button>
                  </div>
                </Field>
              </Card>
            )}
            {step === 4 && (
              <Card className="flex flex-col items-start gap-4 p-6">
                <Mail className="size-8 text-primary" />
                <div><h1 className="text-xl font-semibold">Send outreach from your Gmail (optional)</h1>
                  <p className="text-sm text-muted-foreground">Emails are drafted for you and only sent when you click Send. Replies are tracked automatically.</p></div>
                {gmail?.connected ? <p className="text-sm text-success">Connected as {gmail.email}</p>
                  : gmail?.configured ? <Button variant="outline" onClick={async () => { await flush(); window.location.href = (await api.get<{ url: string }>("/gmail/connect")).url; }}>Connect Gmail</Button>
                  : <p className="text-sm text-muted-foreground">Needs Google OAuth credentials in the API&apos;s .env. You can do this later in Settings.</p>}
              </Card>
            )}
            {step === 5 && (
              <Card className="flex flex-col items-center gap-4 p-10 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"><Rocket className="size-7" /></div>
                <h1 className="text-xl font-semibold">Ready to hunt</h1>
                <p className="max-w-md text-sm text-muted-foreground">We&apos;ll collect jobs now. Then hit <b>Match &amp; score</b> on the dashboard to rank them against your CV. After that it runs every morning.</p>
                <Button size="lg" onClick={() => finish(true)} loading={finishing}><Rocket /> Collect my first jobs</Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {step < 5 && (
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ArrowLeft /> Back</Button>
            <Button onClick={next} disabled={!canNext}>{step === 4 ? "Almost done" : "Continue"} <ArrowRight /></Button>
          </div>
        )}
      </div>
    </main>
  );
}
