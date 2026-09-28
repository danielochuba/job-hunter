"use client";

import { Building2, CircleHelp, GraduationCap, Lightbulb, MessageSquare, ShieldAlert, Sparkles, Wand2 } from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/components/app/bits";
import { RunProgress, useRunWatcher } from "@/components/app/run-watch";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, usePrep } from "@/lib/api/hooks";
import type { Job } from "@/lib/api/types";
import { timeAgo } from "@/lib/utils";

function Section({ icon: Icon, title, children }: { icon: typeof Lightbulb; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4 text-primary" /> {title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const bullets = (items: string[]) => (
  <ul className="flex flex-col gap-2 text-sm">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}</ul>
);

export function PrepTab({ job }: { job: Job }) {
  const { data: prep, isLoading } = usePrep(job.id);
  const [runId, setRunId] = React.useState<number | null>(null);
  const run = useRunWatcher(runId, { invalidate: [keys.jobPart(job.id, "prep"), keys.job(job.id)], onDone: () => setRunId(null), onFail: () => setRunId(null) });
  const generate = async () => setRunId((await api.post<{ run_id: number }>("/runs/prep", { job_id: job.id })).run_id);

  if (isLoading) return <Skeleton className="h-96 rounded-xl" />;
  if (!prep) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState icon={GraduationCap} title="Interview prep pack"
          description="A company brief, likely questions with answers drawn from your real experience, questions to ask, and topics to revise."
          action={<Button onClick={generate} loading={!!runId}><Wand2 /> Generate prep pack</Button>} />
        {runId && <RunProgress run={run} />}
      </div>
    );
  }
  const c = prep.content;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Generated {timeAgo(prep.created_at)}</p>
        <Button variant="outline" size="sm" onClick={generate} loading={!!runId}><Sparkles /> Regenerate</Button>
      </div>
      {runId && <RunProgress run={run} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section icon={Building2} title="Company brief"><p className="text-sm leading-relaxed">{c.company_brief}</p></Section>
        <Section icon={Lightbulb} title="Why you">{bullets(c.why_you)}</Section>
      </div>
      <Section icon={MessageSquare} title={`Likely questions (${c.likely_questions.length})`}>
        <div className="flex flex-col divide-y">
          {c.likely_questions.map((q, i) => (
            <details key={i} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-start gap-3 text-sm font-medium">
                <Badge variant="outline" className="mt-0.5 capitalize">{q.type}</Badge>
                <span className="flex-1">{q.question}</span>
                <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="mt-2 ml-[4.5rem] text-sm text-muted-foreground">
                <p className="leading-relaxed">{q.answer_outline}</p>
                {q.bullet_ids.length > 0 && <p className="mt-1 font-mono text-[11px]">Evidence: {q.bullet_ids.join(", ")}</p>}
              </div>
            </details>
          ))}
        </div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section icon={CircleHelp} title="Questions to ask">{bullets(c.questions_to_ask)}</Section>
        <Section icon={ShieldAlert} title="Likely concerns">{bullets(c.red_flags)}</Section>
        <Section icon={GraduationCap} title="Revise before">{bullets(c.study_topics)}</Section>
      </div>
    </div>
  );
}
