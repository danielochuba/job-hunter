"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarClock, Coins, Filter, Globe, Link2, Mail, Plus, Radar, SlidersHorizontal, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ChipInput, CompanyLogo, PageHeader } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Confirm, Switch } from "@/components/ui/overlays";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Skeleton } from "@/components/ui/primitives";
import { SaveIndicator } from "@/features/profile/save-indicator";
import { useAutosave } from "@/features/profile/use-autosave";
import { api } from "@/lib/api/client";
import { keys, useCompanies, useGmail, useSettings } from "@/lib/api/hooks";
import type { Settings } from "@/lib/api/types";
import { formatDate, titleCase } from "@/lib/utils";

const AGGREGATOR_INFO: Record<string, string> = {
  remotive: "Remote jobs, searchable", remoteok: "Remote tech jobs", arbeitnow: "Europe-focused, many visa-friendly",
  himalayas: "Remote jobs with region info", jobicy: "Remote jobs by tag", weworkremotely: "Remote dev & ops feeds",
  hn_whoishiring: "Monthly Hacker News thread",
};
const INVALIDATE = [keys.settings];

function Section({ icon: Icon, title, description, children, id }: { icon: typeof Globe; title: string; description?: string; children: React.ReactNode; id?: string }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Icon className="size-4 text-primary" /> {title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

function Companies() {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [url, setUrl] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: keys.companies });
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await api.post<{ source: string; token: string }>("/companies", { url: url.trim() });
      toast.success(`Added ${c.token} (${titleCase(c.source)})`);
      setUrl("");
      refresh();
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };
  return (
    <Section icon={Building2} title="Companies you're watching" description="Paste a careers page. Greenhouse, Lever, Ashby, Workable, SmartRecruiters and Recruitee boards are detected automatically.">
      <form onSubmit={add} className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input className="pl-9" type="url" required placeholder="https://stripe.com/jobs  or  https://jobs.lever.co/acme" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <Button type="submit" loading={busy}><Plus /> Add</Button>
      </form>
      <div className="flex flex-col divide-y rounded-lg border">
        {!companies?.length && <p className="p-4 text-center text-sm text-muted-foreground">No companies yet. Aggregators below still bring in jobs.</p>}
        {companies?.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-3 py-2">
            <CompanyLogo company={c.name || c.token} domain={c.domain} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c.name || c.token}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{c.source}/{c.token}{c.domain ? ` · ${c.domain}` : ""}</p>
            </div>
            <Badge variant="muted">{c.jobs} jobs</Badge>
            <Switch checked={c.active} aria-label="Active" onCheckedChange={async (active) => { await api.patch(`/companies/${c.id}`, { active }); refresh(); }} />
            <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={async () => { await api.del(`/companies/${c.id}`); refresh(); }}><Trash2 /></Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Gmail() {
  const qc = useQueryClient();
  const { data: gmail } = useGmail();
  const router = useRouter();
  const sp = useSearchParams();
  React.useEffect(() => {
    const status = sp.get("gmail");
    if (!status) return;
    if (status === "connected") toast.success(`Gmail connected as ${sp.get("email")}`);
    else toast.error(`Gmail connection failed: ${sp.get("reason")}`);
    qc.invalidateQueries({ queryKey: keys.gmail });
    router.replace("/settings#gmail");
  }, [sp, qc, router]);
  const connect = async () => {
    try { window.location.href = (await api.get<{ url: string }>("/gmail/connect")).url; }
    catch (e) { toast.error((e as Error).message); }
  };
  const disconnect = async () => { await api.post("/gmail/disconnect"); qc.invalidateQueries({ queryKey: keys.gmail }); };
  const sync = async () => {
    try { const r = await api.post<{ replies: number }>("/gmail/sync"); toast.success(`${r.replies} new replies`); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <Section id="gmail" icon={Mail} title="Gmail" description="Send reviewed outreach from your own address and track replies. Nothing is ever sent without your click.">
      {!gmail?.configured ? (
        <p className="text-sm text-muted-foreground">Add <code className="rounded bg-muted px-1 font-mono text-xs">GOOGLE_CLIENT_ID</code> and <code className="rounded bg-muted px-1 font-mono text-xs">GOOGLE_CLIENT_SECRET</code> to the API&apos;s .env (see its README), then restart it.</p>
      ) : gmail.connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">Connected</Badge><span className="text-sm">{gmail.email}</span>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={sync}>Check for replies</Button>
            <Confirm title="Disconnect Gmail?" description="Sent emails stay in history; reply tracking stops." confirmLabel="Disconnect" destructive onConfirm={disconnect}
              trigger={<Button variant="ghost" size="sm">Disconnect</Button>} />
          </div>
        </div>
      ) : (
        <Button className="self-start" onClick={connect}><Mail /> Connect Gmail</Button>
      )}
    </Section>
  );
}

function SettingsForm({ initial }: { initial: Settings }) {
  const { draft, update, state } = useAutosave<Settings>(initial, "/settings", INVALIDATE);
  if (!draft) return null;
  const s = draft;
  const setFilter = (k: keyof Settings["filters"], v: string[]) => update("filters", { ...s.filters, [k]: v });
  const setMatching = (k: keyof Settings["matching"], v: number) => update("matching", { ...s.matching, [k]: v });
  const setSchedule = (patch: Partial<Settings["schedule"]>) => update("schedule", { ...s.schedule, ...patch });
  const num = (v: string, fallback: number) => (v === "" || Number.isNaN(Number(v)) ? fallback : Number(v));

  return (
    <>
      <div className="flex justify-end"><SaveIndicator state={state} /></div>
      <Section icon={Radar} title="Job boards & search" description="Aggregators are searched with these queries (or your target roles if empty).">
        <Field label="Search queries"><ChipInput value={s.search_queries} onChange={(v) => update("search_queries", v)} placeholder="python, django, backend engineer…" /></Field>
        <div className="grid gap-2 sm:grid-cols-2">
          {s.available_aggregators.map((a) => (
            <label key={a} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50">
              <span><span className="block text-sm font-medium">{titleCase(a)}</span><span className="text-xs text-muted-foreground">{AGGREGATOR_INFO[a]}</span></span>
              <Switch checked={s.aggregators.includes(a)}
                onCheckedChange={(on) => update("aggregators", on ? [...s.aggregators, a] : s.aggregators.filter((x) => x !== a))} />
            </label>
          ))}
        </div>
      </Section>

      <Section icon={Filter} title="Title & location filters" description="Cheap keyword filters applied before anything is stored. Empty means no filter.">
        <Field label="Title must include one of"><ChipInput value={s.filters.title_include} onChange={(v) => setFilter("title_include", v)} placeholder="backend, python, platform…" /></Field>
        <Field label="Title must not include"><ChipInput value={s.filters.title_exclude} onChange={(v) => setFilter("title_exclude", v)} placeholder="principal, director, intern…" /></Field>
        <Field label="Location must include one of"><ChipInput value={s.filters.locations} onChange={(v) => setFilter("locations", v)} placeholder="remote, lagos, london…" /></Field>
      </Section>

      <Section icon={SlidersHorizontal} title="Matching" description="After your first match, check the Filtered view on Jobs and lower the threshold if good jobs were dropped.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Similarity threshold: ${s.matching.similarity_threshold.toFixed(2)}`} hint="Embedding cutoff before LLM scoring">
            <input type="range" min={0.1} max={0.6} step={0.01} value={s.matching.similarity_threshold}
              onChange={(e) => setMatching("similarity_threshold", Number(e.target.value))} className="accent-[var(--primary)]" />
          </Field>
          <Field label="Max jobs scored per run" hint="Caps LLM calls per match">
            <Input type="number" min={1} max={200} value={s.matching.score_limit} onChange={(e) => setMatching("score_limit", num(e.target.value, 30))} />
          </Field>
          <Field label="Min fit for “generate top N”"><Input type="number" min={0} max={100} value={s.matching.min_fit_for_generate} onChange={(e) => setMatching("min_fit_for_generate", num(e.target.value, 70))} /></Field>
          <Field label="Notify me about jobs with fit ≥"><Input type="number" min={0} max={100} value={s.matching.alert_min_fit} onChange={(e) => setMatching("alert_min_fit", num(e.target.value, 80))} /></Field>
        </div>
      </Section>

      <Section icon={CalendarClock} title="Daily routine" description={`Runs collect → match while the API is running. ${s.next_daily_run ? `Next run: ${formatDate(s.next_daily_run, "EEE d MMM, HH:mm")}.` : ""}`}>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm"><Switch checked={s.schedule.enabled} onCheckedChange={(v) => setSchedule({ enabled: v })} /> Enabled</label>
          <label className="flex items-center gap-2 text-sm">At <Input type="time" className="w-32" value={s.schedule.time} onChange={(e) => setSchedule({ time: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={s.schedule.auto_match} onCheckedChange={(v) => setSchedule({ auto_match: v })} /> Also match &amp; score</label>
        </div>
        <Field label="Follow-up reminder after applying (days)" className="max-w-xs">
          <Input type="number" min={1} max={60} value={s.followup_days} onChange={(e) => update("followup_days", num(e.target.value, 7))} />
        </Field>
      </Section>

      <Section icon={Coins} title="LLM budget" description="New LLM runs are refused once this month's spend reaches the budget.">
        <Field label="Monthly budget (USD)" className="max-w-xs">
          <Input type="number" min={0} step={1} value={s.monthly_budget_usd} onChange={(e) => update("monthly_budget_usd", num(e.target.value, 0))} />
        </Field>
      </Section>
    </>
  );
}

function SettingsPageInner() {
  const { data, isLoading } = useSettings();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Where jobs come from, how they're filtered and ranked, and what runs automatically." />
      <Companies />
      {isLoading || !data ? <Skeleton className="h-96 rounded-xl" /> : <SettingsForm initial={data} />}
      <Gmail />
    </div>
  );
}

export default function SettingsPage() {
  return <React.Suspense><SettingsPageInner /></React.Suspense>;
}
