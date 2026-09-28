"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, MailCheck, MailOpen, Paperclip, Search, Send, Trash2, UserPlus, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/bits";
import { RunProgress, useRunWatcher } from "@/components/app/run-watch";
import { Button } from "@/components/ui/button";
import { Confirm, Progress, Switch, Tooltip } from "@/components/ui/overlays";
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useContacts, useGmail, useOutreach } from "@/lib/api/hooks";
import type { Contact, Job, Outreach } from "@/lib/api/types";
import { cn, timeAgo, titleCase } from "@/lib/utils";

const SOURCE_LABEL: Record<Contact["source"], string> = {
  job_post: "In posting", hunter: "Hunter.io", website: "Company site", pattern: "Generic inbox", manual: "Added by you",
};

export function ContactsTab({ job, onDrafted }: { job: Job; onDrafted: () => void }) {
  const qc = useQueryClient();
  const { data: contacts, isLoading } = useContacts(job.id);
  const [runId, setRunId] = React.useState<number | null>(null);
  const [drafting, setDrafting] = React.useState<number | "manual" | null>(null);
  const [adding, setAdding] = React.useState({ email: "", name: "", role: "" });
  const run = useRunWatcher(runId, {
    invalidate: [keys.jobPart(job.id, "contacts"), keys.job(job.id)],
    onDone: (r) => { toast.success(`Found ${(r.result as { contacts?: number })?.contacts ?? 0} contacts`); setRunId(null); },
    onFail: () => setRunId(null),
  });

  const find = async () => {
    try { setRunId((await api.post<{ run_id: number }>("/runs/contacts", { job_ids: [job.id] })).run_id); }
    catch (e) { toast.error((e as Error).message); }
  };
  const draft = async (contact: Contact | null) => {
    setDrafting(contact?.id ?? "manual");
    try {
      await api.post("/outreach/draft", { job_id: job.id, contact_id: contact?.id ?? null, to_email: contact ? null : adding.email });
      toast.success("Draft ready in the Outreach tab");
      qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "outreach") });
      onDrafted();
    } catch (e) { toast.error((e as Error).message); } finally { setDrafting(null); }
  };
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/contacts", { job_id: job.id, ...adding });
      setAdding({ email: "", name: "", role: "" });
      qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "contacts") });
    } catch (err) { toast.error((err as Error).message); }
  };
  const remove = async (id: number) => {
    await api.del(`/contacts/${id}`);
    qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "contacts") });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          People to reach at <span className="font-medium text-foreground">{job.company}</span>
          {job.company_domain && <> · <span className="font-mono">{job.company_domain}</span></>}
        </p>
        <Button onClick={find} loading={!!runId}><Search /> Find contacts</Button>
      </div>
      {runId && <RunProgress run={run} />}
      {isLoading && <Skeleton className="h-40 rounded-xl" />}
      {!isLoading && !contacts?.length && !runId && (
        <EmptyState icon={Users} title="No contacts yet"
          description="Search the posting, the company's website and Hunter.io (if configured) for recruiters and hiring managers." />
      )}
      {!!contacts?.length && (
        <Card>
          <CardContent className="divide-y p-0">
            {contacts.map((c) => (
              <div key={c.id} className="group flex flex-wrap items-center gap-4 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name || c.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.name ? c.email : ""}{c.role ? `${c.name ? " · " : ""}${c.role}` : ""}</p>
                </div>
                <Badge variant="outline">{SOURCE_LABEL[c.source]}</Badge>
                <Tooltip content="How likely this address reaches the right person">
                  <div className="flex w-24 items-center gap-2">
                    <Progress value={c.confidence} indicatorClassName={c.confidence >= 70 ? "bg-success" : c.confidence >= 40 ? "bg-warning" : "bg-muted-foreground"} />
                    <span className="w-7 font-mono text-[11px] text-muted-foreground tabular">{c.confidence}</span>
                  </div>
                </Tooltip>
                <Button size="sm" variant="soft" onClick={() => draft(c)} loading={drafting === c.id}><Wand2 /> Draft email</Button>
                <Button size="icon-sm" variant="ghost" aria-label="Remove contact" className="opacity-40 group-hover:opacity-100" onClick={() => remove(c.id)}><Trash2 /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="size-4" /> Add someone you know</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-wrap gap-2">
            <Input className="w-56" type="email" placeholder="email@company.com" required value={adding.email} onChange={(e) => setAdding({ ...adding, email: e.target.value })} />
            <Input className="w-40" placeholder="Name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} />
            <Input className="w-44" placeholder="Role" value={adding.role} onChange={(e) => setAdding({ ...adding, role: e.target.value })} />
            <Button type="submit" variant="outline">Add</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ================================================================ Outreach

const STATUS: Record<Outreach["status"], { label: string; icon: typeof Mail; variant: "muted" | "default" | "success" | "outline" }> = {
  draft: { label: "Draft", icon: Mail, variant: "muted" },
  sent: { label: "Sent", icon: MailCheck, variant: "default" },
  replied: { label: "Replied", icon: MailOpen, variant: "success" },
  skipped: { label: "Skipped", icon: Mail, variant: "outline" },
};

function OutreachCard({ o, job, gmailReady }: { o: Outreach; job: Job; gmailReady: boolean }) {
  const qc = useQueryClient();
  const [draft, setDraft] = React.useState({ to_email: o.to_email, subject: o.subject, body: o.body, attach_cv: o.attach_cv });
  const [busy, setBusy] = React.useState<string | null>(null);
  const locked = o.status === "sent" || o.status === "replied";
  const dirty = draft.subject !== o.subject || draft.body !== o.body || draft.to_email !== o.to_email || draft.attach_cv !== o.attach_cv;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "outreach") });
    qc.invalidateQueries({ queryKey: keys.job(job.id) });
    qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "events") });
  };
  const act = async (name: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(name);
    try { await fn(); if (ok) toast.success(ok); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };
  const save = () => act("save", () => api.put(`/outreach/${o.id}`, draft), "Draft saved");
  const send = () => act("send", async () => { if (dirty) await api.put(`/outreach/${o.id}`, draft); await api.post(`/outreach/${o.id}/send`); }, `Sent to ${draft.to_email}`);
  const S = STATUS[o.status];

  return (
    <Card className={cn(o.status === "replied" && "border-success/40")}>
      <CardHeader className="flex-row flex-wrap items-center gap-2">
        <Badge variant={S.variant}><S.icon /> {S.label}</Badge>
        <span className="text-sm">{o.contact_name || o.to_email}</span>
        {o.contact_role && <span className="text-xs text-muted-foreground">· {o.contact_role}</span>}
        <span className="ml-auto text-xs text-muted-foreground">{o.sent_at ? `sent ${timeAgo(o.sent_at)}` : `drafted ${timeAgo(o.created_at)}`}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {o.status === "replied" && o.reply_snippet && (
          <div className="rounded-lg bg-success/10 p-3 text-sm"><span className="font-medium text-success">Reply {timeAgo(o.replied_at)}:</span> {o.reply_snippet}</div>
        )}
        <div className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:items-center">
          <span className="text-xs text-muted-foreground">To</span>
          <Input value={draft.to_email} disabled={locked} onChange={(e) => setDraft({ ...draft, to_email: e.target.value })} />
          <span className="text-xs text-muted-foreground">Subject</span>
          <Input value={draft.subject} disabled={locked} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
        </div>
        <Textarea rows={9} value={draft.body} disabled={locked} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={draft.attach_cv} disabled={locked} onCheckedChange={(v) => setDraft({ ...draft, attach_cv: v })} />
            <Paperclip className="size-4" /> Attach tailored CV (PDF)
          </label>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`); toast.success("Copied"); }}><Copy /> Copy</Button>
            <Button size="sm" variant="ghost" asChild>
              <a href={`mailto:${draft.to_email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`}><Mail /> Open in mail app</a>
            </Button>
            {!locked && <>
              <Button size="sm" variant="ghost" onClick={() => act("delete", () => api.del(`/outreach/${o.id}`))} loading={busy === "delete"}><Trash2 /></Button>
              <Button size="sm" variant="outline" onClick={save} disabled={!dirty} loading={busy === "save"}>Save</Button>
              {gmailReady ? (
                <Confirm title="Send this email?" confirmLabel="Send now" onConfirm={send}
                  description={<>From your Gmail to <b>{draft.to_email}</b>{draft.attach_cv ? " with your tailored CV attached" : ""}. This can&apos;t be undone.</>}
                  trigger={<Button size="sm" loading={busy === "send"}><Send /> Send</Button>} />
              ) : (
                <Tooltip content="Connect Gmail in Settings to send from the app">
                  <Button size="sm" asChild variant="outline"><Link href="/settings#gmail"><Send /> Connect Gmail</Link></Button>
                </Tooltip>
              )}
            </>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function OutreachTab({ job }: { job: Job }) {
  const { data: items, isLoading } = useOutreach(job.id);
  const { data: gmail } = useGmail();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!items?.length) {
    return <EmptyState icon={Mail} title="No emails yet" description="Find contacts, then draft a short, truthful email from your CV. Nothing is sent until you click Send." />;
  }
  return (
    <div className="flex flex-col gap-4">
      {items.map((o) => <OutreachCard key={o.id} o={o} job={job} gmailReady={!!gmail?.connected} />)}
      <p className="text-center text-xs text-muted-foreground">{titleCase(gmail?.connected ? `sending as ${gmail.email}` : "gmail not connected")}</p>
    </div>
  );
}
