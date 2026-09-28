"use client";

import { useQueryClient } from "@tanstack/react-query";
import { diffWords } from "diff";
import { Download, FileText, GitCompare, Plus, Save, ShieldCheck, TriangleAlert, Wand2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ChipInput, EmptyState } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/overlays";
import { Card, CardContent, CardHeader, CardTitle, Label, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useApplications, useCV, useStartRun } from "@/lib/api/hooks";
import type { Application, Job, MasterCV, TailoredResult } from "@/lib/api/types";
import { cn, timeAgo, wordCount } from "@/lib/utils";

async function openFile(appId: number, kind: "cv_pdf" | "cv_html" | "cover_letter") {
  try {
    const files = await api.get<Record<string, string | null>>(`/applications/${appId}/files`);
    const url = files[kind];
    if (!url) return toast.error(kind === "cv_pdf" ? "No PDF for this version (WeasyPrint isn't installed). Use Print → Save as PDF in the preview." : "File not found");
    window.open(url, "_blank", "noopener");
  } catch (e) {
    toast.error((e as Error).message);
  }
}

function useVersion(jobId: number) {
  const { data: apps, isLoading } = useApplications(jobId);
  const [selected, setSelected] = React.useState<number | null>(null);
  const app = apps?.find((a) => a.id === selected) ?? apps?.[0];
  return { apps, app, isLoading, setSelected };
}

function VersionPicker({ apps, app, onChange }: { apps: Application[]; app: Application; onChange: (id: number) => void }) {
  return (
    <Select value={String(app.id)} onValueChange={(v) => onChange(Number(v))} className="w-56"
      options={apps.map((a) => ({ value: String(a.id), label: `v${a.version} · ${timeAgo(a.created_at)}${a.cv_name ? ` · ${a.cv_name}` : ""}` }))} />
  );
}

function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings?.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
        <ShieldCheck className="size-4" /> Every bullet traces back to your master CV.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
      <p className="mb-1 flex items-center gap-1.5 font-medium text-warning"><TriangleAlert className="size-4" /> Truthfulness guard removed {warnings.length} item(s)</p>
      <ul className="list-disc pl-5 text-muted-foreground">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
    </div>
  );
}

function NoDocuments({ job }: { job: Job }) {
  const startRun = useStartRun();
  return (
    <EmptyState icon={FileText} title="No tailored documents yet"
      description="Generate a CV and cover letter tailored to this job. Everything is traced back to your master CV."
      action={<Button onClick={() => startRun.mutate({ kind: "generate", body: { job_ids: [job.id] } })} loading={startRun.isPending}><Wand2 /> Generate</Button>} />
  );
}

// ================================================================ CV tab

export function CvTab({ job }: { job: Job }) {
  const { apps, app, isLoading, setSelected } = useVersion(job.id);
  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!apps?.length || !app) return <NoDocuments job={job} />;
  return <CvEditor key={app.id} job={job} app={app} apps={apps} onVersion={setSelected} />;
}

function CvEditor({ job, app, apps, onVersion }: { job: Job; app: Application; apps: Application[]; onVersion: (id: number) => void }) {
  const qc = useQueryClient();
  const { data: master } = useCV(app.cv_id ?? 0);
  const [draft, setDraft] = React.useState<TailoredResult>(app.result);
  const [html, setHtml] = React.useState<string>("");
  const [previewWarnings, setPreviewWarnings] = React.useState<string[]>(app.warnings);
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(app.result);

  // Live preview (validated server-side, not stored), debounced.
  React.useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = dirty
          ? await api.post<{ html: string; warnings: string[] }>(`/applications/${app.id}/preview`, { result: draft })
          : { ...(await api.get<{ html: string }>(`/applications/${app.id}/html`)), warnings: app.warnings };
        if (!cancelled) { setHtml(res.html); setPreviewWarnings(res.warnings); }
      } catch { /* preview is best-effort */ }
    }, dirty ? 500 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [draft, dirty, app.id, app.warnings]);

  const save = async () => {
    setSaving(true);
    try {
      const v = await api.put<Application>(`/applications/${app.id}`, { result: draft });
      toast.success(`Saved as v${v.version}`);
      await qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "applications") });
      onVersion(v.id);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const roleName = (section: "experience" | "projects", id: string) => {
    const cv = master?.cv as MasterCV | undefined;
    if (!cv) return id;
    if (section === "experience") { const r = cv.experience.find((e) => e.id === id); return r ? `${r.title} · ${r.company}` : id; }
    return cv.projects.find((p) => p.id === id)?.name ?? id;
  };
  const sourceText = (id: string) => {
    const cv = master?.cv as MasterCV | undefined;
    for (const s of [...(cv?.experience ?? []), ...(cv?.projects ?? [])]) {
      const b = s.bullets.find((x) => x.id === id);
      if (b) return b.text;
    }
    return "";
  };
  const unusedBullets = (section: "experience" | "projects", id: string) => {
    const cv = master?.cv as MasterCV | undefined;
    const item = cv?.[section].find((x) => x.id === id);
    const used = new Set(draft[section].find((x) => x.id === id)?.bullets.map((b) => b.source_id));
    return (item?.bullets ?? []).filter((b) => !used.has(b.id));
  };
  const setBullets = (section: "experience" | "projects", id: string, fn: (b: TailoredResult["experience"][0]["bullets"]) => TailoredResult["experience"][0]["bullets"]) =>
    setDraft((d) => ({ ...d, [section]: d[section].map((x) => (x.id === id ? { ...x, bullets: fn(x.bullets) } : x)) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <VersionPicker apps={apps} app={app} onChange={onVersion} />
        <Button variant="outline" size="sm" onClick={() => openFile(app.id, "cv_pdf")}><Download /> PDF</Button>
        <Button variant="outline" size="sm" onClick={() => openFile(app.id, "cv_html")}><Download /> HTML</Button>
        <div className="ml-auto flex items-center gap-2">
          {dirty && <Button variant="ghost" size="sm" onClick={() => setDraft(app.result)}>Discard</Button>}
          <Button size="sm" onClick={save} disabled={!dirty} loading={saving}><Save /> Save as v{Math.max(...apps.map((a) => a.version)) + 1}</Button>
        </div>
      </div>
      <Warnings warnings={previewWarnings} />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Skills (in priority order)</CardTitle></CardHeader>
            <CardContent>
              <ChipInput value={draft.skills_priority} onChange={(v) => setDraft({ ...draft, skills_priority: v })} placeholder="Only skills from your CV are kept" />
            </CardContent>
          </Card>
          {(["experience", "projects"] as const).map((section) => draft[section].map((item) => (
            <Card key={`${section}-${item.id}`}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{roleName(section, item.id)}</CardTitle>
                <Button variant="ghost" size="icon-sm" aria-label="Remove section"
                  onClick={() => setDraft((d) => ({ ...d, [section]: d[section].filter((x) => x.id !== item.id) }))}><X /></Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {item.bullets.map((b, i) => (
                  <div key={b.source_id} className="group flex gap-2">
                    <div className="flex-1">
                      <Textarea rows={2} className="min-h-0 text-sm" value={b.text}
                        onChange={(e) => setBullets(section, item.id, (bs) => bs.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                      <p className="mt-1 truncate text-[11px] text-muted-foreground" title={sourceText(b.source_id)}>
                        from <span className="font-mono">{b.source_id}</span>: {sourceText(b.source_id)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Remove bullet" className="opacity-50 group-hover:opacity-100"
                      onClick={() => setBullets(section, item.id, (bs) => bs.filter((_, j) => j !== i))}><X /></Button>
                  </div>
                ))}
                {unusedBullets(section, item.id).length > 0 && (
                  <Select value="" placeholder="+ Add a bullet from your CV" className="w-full text-muted-foreground"
                    onValueChange={(id) => setBullets(section, item.id, (bs) => [...bs, { source_id: id, text: sourceText(id) }])}
                    options={unusedBullets(section, item.id).map((b) => ({ value: b.id, label: b.text.slice(0, 90) }))} />
                )}
              </CardContent>
            </Card>
          )))}
        </div>
        <div className="xl:sticky xl:top-20 xl:self-start">
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b bg-muted px-3 py-2 text-xs text-muted-foreground">
              <span className="size-2.5 rounded-full bg-destructive/60" /><span className="size-2.5 rounded-full bg-warning/60" /><span className="size-2.5 rounded-full bg-success/60" />
              <span className="ml-2">Live preview{dirty ? " (unsaved)" : ""}</span>
            </div>
            {html ? <iframe title="CV preview" srcDoc={html} sandbox="allow-same-origin allow-modals" className="h-[72vh] w-full" />
              : <Skeleton className="m-4 h-[60vh]" />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ================================================================ Cover letter tab

export function CoverLetterTab({ job }: { job: Job }) {
  const { apps, app, isLoading, setSelected } = useVersion(job.id);
  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!apps?.length || !app) return <NoDocuments job={job} />;
  return <LetterEditor key={app.id} job={job} app={app} apps={apps} onVersion={setSelected} />;
}

function LetterEditor({ job, app, apps, onVersion }: { job: Job; app: Application; apps: Application[]; onVersion: (id: number) => void }) {
  const qc = useQueryClient();
  const [text, setText] = React.useState(app.cover_letter);
  const [showDiff, setShowDiff] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const previous = apps.find((a) => a.version === app.version - 1);
  const words = wordCount(text);
  const dirty = text !== app.cover_letter;

  const save = async () => {
    setSaving(true);
    try {
      const v = await api.put<Application>(`/applications/${app.id}`, { cover_letter: text });
      toast.success(`Saved as v${v.version}`);
      await qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "applications") });
      onVersion(v.id);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <VersionPicker apps={apps} app={app} onChange={onVersion} />
        <Button variant="outline" size="sm" onClick={() => openFile(app.id, "cover_letter")}><Download /> .txt</Button>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}>Copy</Button>
        {previous && (
          <label className="ml-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showDiff} onCheckedChange={setShowDiff} /> <GitCompare className="size-4" /> Diff vs v{previous.version}
          </label>
        )}
        <div className="ml-auto flex items-center gap-3">
          <span className={cn("font-mono text-xs tabular", words < 180 || words > 320 ? "text-warning" : "text-muted-foreground")}>{words} words</span>
          {dirty && <Button variant="ghost" size="sm" onClick={() => setText(app.cover_letter)}>Discard</Button>}
          <Button size="sm" onClick={save} disabled={!dirty} loading={saving}><Save /> Save version</Button>
        </div>
      </div>
      {showDiff && previous ? (
        <Card>
          <CardContent className="pt-5 text-sm leading-7 whitespace-pre-wrap">
            {diffWords(previous.cover_letter, text).map((part, i) => (
              <span key={i} className={cn(part.added && "rounded bg-success/20 text-success", part.removed && "rounded bg-destructive/15 text-destructive line-through")}>
                {part.value}
              </span>
            ))}
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-2 shadow-xs">
          <Label className="sr-only" htmlFor="letter">Cover letter</Label>
          <textarea id="letter" value={text} onChange={(e) => setText(e.target.value)}
            className="min-h-[60vh] w-full resize-y rounded-lg bg-transparent p-6 font-serif text-[15px] leading-8 outline-none" />
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">
        <Plus className="mr-1 inline size-3" />Aim for 200–300 words. Saving creates a new version; older versions are kept.
      </p>
    </div>
  );
}
