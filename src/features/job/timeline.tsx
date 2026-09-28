"use client";

import { useQueryClient } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ArrowRightLeft, BellPlus, CheckCheck, FileText, Inbox, MailCheck, StickyNote } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useEvents } from "@/lib/api/hooks";
import type { Job, TimelineEvent } from "@/lib/api/types";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const ICON: Record<TimelineEvent["kind"], typeof StickyNote> = {
  stage_change: ArrowRightLeft, note: StickyNote, email_sent: MailCheck, reply: Inbox, reminder_done: CheckCheck, generated: FileText,
};

export function TimelineTab({ job }: { job: Job }) {
  const qc = useQueryClient();
  const { data: events, isLoading } = useEvents(job.id);
  const [note, setNote] = React.useState("");
  const [due, setDue] = React.useState(format(addDays(new Date(), 3), "yyyy-MM-dd'T'09:00"));
  const [remNote, setRemNote] = React.useState(`Follow up with ${job.company}`);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "events") });
    qc.invalidateQueries({ queryKey: keys.job(job.id) });
    qc.invalidateQueries({ queryKey: keys.reminders });
    qc.invalidateQueries({ queryKey: keys.stats });
  };
  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    await api.post(`/jobs/${job.id}/events`, { note });
    setNote("");
    refresh();
  };
  const addReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/reminders", { job_id: job.id, due_at: new Date(due).toISOString(), note: remNote });
      toast.success(`Reminder set for ${formatDate(new Date(due).toISOString(), "EEE d MMM, HH:mm")}`);
      refresh();
    } catch (err) { toast.error((err as Error).message); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addNote} className="mb-6 flex flex-col gap-2">
            <Textarea rows={2} placeholder="Add a note: interview feedback, recruiter call, salary chat…" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button size="sm" className="self-end" disabled={!note.trim()}>Add note</Button>
          </form>
          {isLoading && <Skeleton className="h-40" />}
          <ol className="relative ml-3 flex flex-col gap-5 border-l pl-6">
            {events?.map((e) => {
              const Icon = ICON[e.kind] ?? StickyNote;
              return (
                <li key={e.id} className="relative">
                  <span className={cn("absolute top-0 -left-[37px] flex size-6 items-center justify-center rounded-full border bg-card",
                    e.kind === "reply" && "border-success/50 text-success", e.kind === "note" && "text-primary")}>
                    <Icon className="size-3" />
                  </span>
                  <p className={cn("text-sm", e.kind === "note" && "whitespace-pre-wrap")}>{e.note}</p>
                  <p className="text-[11px] text-muted-foreground" title={e.at}>{timeAgo(e.at)}</p>
                </li>
              );
            })}
            {!isLoading && !events?.length && <li className="text-sm text-muted-foreground">Nothing yet.</li>}
          </ol>
        </CardContent>
      </Card>
      <Card className="self-start">
        <CardHeader><CardTitle className="flex items-center gap-2"><BellPlus className="size-4" /> Set a reminder</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addReminder} className="flex flex-col gap-2">
            <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} required />
            <Input value={remNote} onChange={(e) => setRemNote(e.target.value)} required />
            <div className="flex flex-wrap gap-1">
              {[2, 5, 7, 14].map((d) => (
                <button key={d} type="button" className="cursor-pointer rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                  onClick={() => setDue(format(addDays(new Date(), d), "yyyy-MM-dd'T'09:00"))}>+{d}d</button>
              ))}
            </div>
            <Button size="sm" variant="outline">Save reminder</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
