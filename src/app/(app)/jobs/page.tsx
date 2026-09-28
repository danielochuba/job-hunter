"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, Link2, Search, SearchX, Wand2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { CompanyLogo, EmptyState, EligibilityChips, PageHeader, ScoreRing, StageBadge } from "@/components/app/bits";
import { FeedbackButtons } from "@/components/app/feedback";
import { useImportJob } from "@/components/app/import-job";
import { Button } from "@/components/ui/button";
import { Checkbox, Select, Tabs, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Input, Kbd, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useJobSources, useJobs, useStartRun } from "@/lib/api/hooks";
import type { JobListItem } from "@/lib/api/types";
import { cn, timeAgo, titleCase } from "@/lib/utils";

const VIEWS = [
  { value: "scored,generated", label: "To review" },
  { value: "approved", label: "Approved" },
  { value: "applied,interviewing,offer", label: "In progress" },
  { value: "new", label: "Unscored" },
  { value: "ineligible,filtered_out", label: "Filtered" },
  { value: "rejected,closed", label: "Archived" },
  { value: "all", label: "All" },
];
const SORTS = [
  { value: "fit", label: "Best fit" }, { value: "new", label: "Newest" },
  { value: "posted", label: "Recently posted" }, { value: "updated", label: "Recently updated" },
];

function JobsTable() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const importJob = useImportJob();
  const startRun = useStartRun();
  const view = sp.get("stage") || "scored,generated";
  const [q, setQ] = React.useState(sp.get("q") || "");
  const [debounced, setDebounced] = React.useState(q);
  const sort = sp.get("sort") || "fit";
  const source = sp.get("source") || "all";
  const minFit = sp.get("min_fit") || "0";
  const page = Number(sp.get("page") || 1);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [cursor, setCursor] = React.useState(0);

  React.useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);

  const setParam = React.useCallback((k: string, v: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (v === null || v === "" || v === "all" || (k === "min_fit" && v === "0")) next.delete(k); else next.set(k, v);
    if (k !== "page") next.delete("page");
    router.replace(`${path}?${next.toString()}`, { scroll: false });
  }, [path, router, sp]);

  React.useEffect(() => { if (debounced !== (sp.get("q") || "")) setParam("q", debounced); }, [debounced, setParam, sp]);

  const { data, isLoading, isFetching } = useJobs({
    stage: view === "all" ? undefined : view, q: debounced || undefined, sort, source: source === "all" ? undefined : source,
    min_fit: minFit === "0" ? undefined : Number(minFit), page, page_size: 50,
  });
  const { data: sources } = useJobSources();
  const items = React.useMemo(() => data?.items ?? [], [data]);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const refresh = React.useCallback(() => {
    qc.invalidateQueries({ queryKey: ["jobs"] });
    qc.invalidateQueries({ queryKey: keys.stats });
  }, [qc]);

  const patch = React.useCallback(async (job: JobListItem, body: Record<string, unknown>, msg?: string) => {
    try {
      await api.patch(`/jobs/${job.id}`, body);
      if (msg) toast.success(msg);
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  }, [refresh]);

  const bulk = async (stage: string) => {
    try {
      await api.post("/jobs/bulk", { ids: [...selected], stage });
      toast.success(`${selected.size} jobs → ${titleCase(stage)}`);
      setSelected(new Set());
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  // Keyboard: j/k move, enter open, a approve, r reject, g generate, x select
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [role=dialog], [contenteditable]") || e.metaKey || e.ctrlKey || !items.length) return;
      const job = items[cursor];
      if (e.key === "j") setCursor((c) => Math.min(items.length - 1, c + 1));
      else if (e.key === "k") setCursor((c) => Math.max(0, c - 1));
      else if (e.key === "Enter" && job) router.push(`/jobs/${job.id}`);
      else if (e.key === "a" && job) patch(job, { stage: "approved" }, `Approved ${job.title}`);
      else if (e.key === "r" && job) patch(job, { stage: "rejected" }, `Rejected ${job.title}`);
      else if (e.key === "g" && job) startRun.mutate({ kind: "generate", body: { job_ids: [job.id] } });
      else if (e.key === "x" && job) setSelected((s) => { const n = new Set(s); if (n.has(job.id)) n.delete(job.id); else n.add(job.id); return n; });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, cursor, router, patch, startRun]);

  React.useEffect(() => {
    document.querySelector(`[data-row="${cursor}"]`)?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const allChecked = items.length > 0 && items.every((j) => selected.has(j.id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Jobs" description={data ? `${data.total.toLocaleString()} jobs in this view` : "Everything collected, ranked against your CVs."}
        actions={<>
          <Button variant="outline" onClick={() => importJob()}><Link2 /> Import</Button>
          <Button onClick={() => startRun.mutate({ kind: "match" })}><Wand2 /> Match new</Button>
        </>} />

      <div className="flex flex-col gap-3">
        <Tabs value={view} onValueChange={(v) => setParam("stage", v)}>
          <TabsList className="h-auto flex-wrap">
            {VIEWS.map((v) => <TabsTrigger key={v.value} value={v.value}>{v.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Title, company, location…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={sort} onValueChange={(v) => setParam("sort", v)} options={SORTS} className="w-40" />
          <Select value={minFit} onValueChange={(v) => setParam("min_fit", v)} className="w-32"
            options={[{ value: "0", label: "Any fit" }, { value: "50", label: "Fit ≥ 50" }, { value: "70", label: "Fit ≥ 70" }, { value: "85", label: "Fit ≥ 85" }]} />
          <Select value={source} onValueChange={(v) => setParam("source", v)} className="w-44"
            options={[{ value: "all", label: "All sources" }, ...(sources ?? []).map((s) => ({ value: s.source, label: `${titleCase(s.source)} (${s.n})` }))]} />
          <p className="ml-auto hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
            <Kbd>j</Kbd><Kbd>k</Kbd> move <Kbd>a</Kbd> approve <Kbd>r</Kbd> reject <Kbd>g</Kbd> generate
          </p>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center gap-2 rounded-xl border bg-card px-4 py-2 shadow-lg animate-in">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="soft" onClick={() => bulk("approved")}><Check /> Approve</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("rejected")}><X /> Reject</Button>
          <Button size="sm" variant="outline" onClick={() => { startRun.mutate({ kind: "generate", body: { job_ids: [...selected] } }); setSelected(new Set()); }}>
            <Wand2 /> Generate CVs
          </Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <div className={cn("overflow-hidden rounded-xl border bg-card shadow-xs transition-opacity", isFetching && !isLoading && "opacity-70")}>
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1fr)_auto_auto_auto]">
          <Checkbox checked={allChecked} aria-label="Select all"
            onCheckedChange={(c) => setSelected(c ? new Set(items.map((j) => j.id)) : new Set())} />
          <span>Role</span>
          <span className="hidden md:block">Signals</span>
          <span className="hidden md:block">Stage</span>
          <span className="hidden text-right md:block">Feedback</span>
          <span className="text-right">Fit</span>
        </div>
        {isLoading && Array.from({ length: 8 }).map((_, i) => <div key={i} className="border-b px-4 py-3"><Skeleton className="h-10" /></div>)}
        {!isLoading && !items.length && (
          <EmptyState icon={SearchX} title="No jobs here" className="m-4 border-0"
            description={debounced ? "Nothing matches your search." : "Try another view, or collect and match new jobs."} />
        )}
        {items.map((j, i) => (
          <div key={j.id} data-row={i} onClick={() => setCursor(i)}
            className={cn("group grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-muted/50 md:grid-cols-[auto_minmax(0,2.2fr)_minmax(0,1fr)_auto_auto_auto]",
              cursor === i && "bg-accent/40 ring-1 ring-primary/30 ring-inset")}>
            <Checkbox checked={selected.has(j.id)} aria-label={`Select ${j.title}`}
              onCheckedChange={(c) => setSelected((s) => { const n = new Set(s); if (c) n.add(j.id); else n.delete(j.id); return n; })} />
            <Link href={`/jobs/${j.id}`} className="flex min-w-0 items-center gap-3">
              <CompanyLogo company={j.company} domain={j.company_domain} size={34} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium group-hover:text-primary">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.company} · {j.location || "—"} · <span title={j.fetched_at}>{timeAgo(j.posted_at || j.fetched_at)}</span>
                </p>
                {j.fit_summary && <p className="mt-0.5 hidden truncate text-xs text-muted-foreground/80 xl:block">{j.fit_summary}</p>}
              </div>
            </Link>
            <div className="hidden min-w-0 md:block">
              <EligibilityChips remote={j.remote_policy} visa={j.visa_sponsorship} ineligible={j.ineligible_reason} compact />
              {j.salary && <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{j.salary}</p>}
            </div>
            <div className="hidden md:block"><StageBadge stage={j.stage} /></div>
            <div className="hidden md:block">
              <FeedbackButtons value={j.feedback} onChange={(feedback, reason) => patch(j, { feedback, feedback_reason: reason }, feedback === "none" ? undefined : "Thanks, noted for ranking")} />
            </div>
            <ScoreRing score={j.fit_score} size={38} />
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setParam("page", String(page - 1))} aria-label="Previous page"><ChevronLeft /></Button>
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => setParam("page", String(page + 1))} aria-label="Next page"><ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return <React.Suspense><JobsTable /></React.Suspense>;
}
