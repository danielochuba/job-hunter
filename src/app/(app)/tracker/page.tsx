"use client";

import {
  DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, MailCheck, MailOpen, SquareKanban } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { CompanyLogo, EmptyState, PageHeader, ScoreRing } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useReminders, useTracker } from "@/lib/api/hooks";
import type { TrackerCard } from "@/lib/api/types";
import { cn, timeAgo, timeUntil, titleCase } from "@/lib/utils";

const COLUMN_TONE: Record<string, string> = {
  generated: "bg-chart-2", approved: "bg-primary", applied: "bg-chart-4", interviewing: "bg-chart-5", offer: "bg-success", closed: "bg-muted-foreground",
};

function JobCard({ job, dragging }: { job: TrackerCard; dragging?: boolean }) {
  const overdue = job.next_due && new Date(job.next_due) < new Date();
  return (
    <div className={cn("rounded-lg border bg-card p-3 shadow-xs transition-shadow", dragging && "rotate-2 shadow-xl ring-2 ring-primary/40")}>
      <div className="flex items-start gap-2.5">
        <CompanyLogo company={job.company} domain={job.company_domain} size={28} />
        <div className="min-w-0 flex-1">
          <Link href={`/jobs/${job.id}`} className="line-clamp-2 text-sm leading-snug font-medium hover:text-primary" onPointerDown={(e) => e.stopPropagation()}>
            {job.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{job.company}</p>
        </div>
        <ScoreRing score={job.fit_score} size={30} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        {job.email_status === "replied" && <span className="inline-flex items-center gap-1 text-success"><MailOpen className="size-3" /> Replied</span>}
        {job.email_status === "sent" && <span className="inline-flex items-center gap-1"><MailCheck className="size-3" /> Emailed</span>}
        {job.next_due && (
          <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-warning")}><BellRing className="size-3" /> {timeUntil(job.next_due)}</span>
        )}
        <span className="ml-auto">{timeAgo(job.last_activity || job.updated_at)}</span>
      </div>
    </div>
  );
}

function Draggable({ job }: { job: TrackerCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: job });
  return (
    <motion.div layout ref={setNodeRef} {...listeners} {...attributes} className={cn("cursor-grab touch-none active:cursor-grabbing", isDragging && "opacity-30")}>
      <JobCard job={job} />
    </motion.div>
  );
}

function Column({ stage, jobs }: { stage: string; jobs: TrackerCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-2 transition-colors", isOver && "border-primary/50 bg-accent/50")}>
      <div className="flex items-center gap-2 px-1.5 py-1">
        <span className={cn("size-2 rounded-full", COLUMN_TONE[stage])} />
        <span className="text-sm font-medium">{titleCase(stage)}</span>
        <span className="ml-auto rounded-full bg-card px-2 font-mono text-[11px] text-muted-foreground tabular">{jobs.length}</span>
      </div>
      <div className="flex min-h-24 flex-col gap-2">
        {jobs.map((j) => <Draggable key={j.id} job={j} />)}
        {!jobs.length && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Drop here</p>}
      </div>
    </div>
  );
}

function Reminders() {
  const qc = useQueryClient();
  const { data } = useReminders();
  const done = async (id: number) => {
    await api.patch(`/reminders/${id}`, { done: true });
    qc.invalidateQueries({ queryKey: keys.reminders });
    qc.invalidateQueries({ queryKey: keys.tracker });
    qc.invalidateQueries({ queryKey: keys.stats });
  };
  if (!data?.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BellRing className="size-4" /> Upcoming follow-ups</CardTitle></CardHeader>
      <CardContent className="flex flex-col divide-y">
        {data.slice(0, 8).map((r) => {
          const overdue = new Date(r.due_at) < new Date();
          return (
            <div key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={cn("w-28 shrink-0 font-mono text-xs", overdue ? "text-warning" : "text-muted-foreground")}>{timeUntil(r.due_at)}</span>
              {r.job_id ? <Link href={`/jobs/${r.job_id}`} className="min-w-0 flex-1 truncate hover:text-primary">{r.note}</Link> : <span className="flex-1 truncate">{r.note}</span>}
              {r.auto && <span className="text-[11px] text-muted-foreground">auto</span>}
              <Button size="sm" variant="ghost" onClick={() => done(r.id)}><Check /> Done</Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function TrackerPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useTracker();
  const [active, setActive] = React.useState<TrackerCard | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onStart = (e: DragStartEvent) => setActive(e.active.data.current as TrackerCard);
  const onEnd = async (e: DragEndEvent) => {
    setActive(null);
    const job = e.active.data.current as TrackerCard;
    const to = e.over?.id as string | undefined;
    if (!to || to === job.stage || !data) return;
    // optimistic move
    qc.setQueryData(keys.tracker, {
      columns: data.columns.map((c) => ({
        ...c, jobs: c.stage === to ? [{ ...job, stage: to }, ...c.jobs] : c.jobs.filter((j) => j.id !== job.id),
      })),
    });
    try {
      await api.patch(`/jobs/${job.id}`, { stage: to });
      if (to === "applied") toast.success("Marked applied", { description: "A follow-up reminder was scheduled." });
      if (to === "offer") toast.success("🎉 Congratulations on the offer!");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      qc.invalidateQueries({ queryKey: keys.tracker });
      qc.invalidateQueries({ queryKey: keys.reminders });
      qc.invalidateQueries({ queryKey: keys.stats });
      qc.invalidateQueries({ queryKey: keys.job(job.id) });
    }
  };

  const total = data?.columns.reduce((n, c) => n + c.jobs.length, 0) ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tracker" description="Drag cards between stages. Moving to Applied schedules an automatic follow-up." />
      {isLoading && <div className="flex gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-80 w-72 rounded-xl" />)}</div>}
      {!isLoading && !total && (
        <EmptyState icon={SquareKanban} title="Nothing in the pipeline yet"
          description="Approve jobs you like, or generate documents for them, and they'll show up here." action={<Button asChild><Link href="/jobs">Review jobs</Link></Button>} />
      )}
      {!!total && data && (
        <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd} onDragCancel={() => setActive(null)}>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-thin md:-mx-8 md:px-8">
            {data.columns.map((c) => <Column key={c.stage} stage={c.stage} jobs={c.jobs} />)}
          </div>
          <DragOverlay>{active && <div className="w-68"><JobCard job={active} dragging /></div>}</DragOverlay>
        </DndContext>
      )}
      <Reminders />
    </div>
  );
}
