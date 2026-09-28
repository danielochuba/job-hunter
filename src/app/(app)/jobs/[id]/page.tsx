"use client";

import {
  BellRing, Check, ChevronLeft, ExternalLink, FileText, GraduationCap, History, LayoutList, Mail, MapPin, RefreshCw, Search, Send, Users, Wand2, X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";

import { CompanyLogo, EligibilityChips, ScoreRing, StageBadge } from "@/components/app/bits";
import { FeedbackButtons } from "@/components/app/feedback";
import { RunProgress, useRunWatcher } from "@/components/app/run-watch";
import { Button } from "@/components/ui/button";
import { Select, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Card, CardContent, Separator, Skeleton } from "@/components/ui/primitives";
import { CvTab, CoverLetterTab } from "@/features/job/documents";
import { ContactsTab, OutreachTab } from "@/features/job/contacts";
import { Overview } from "@/features/job/overview";
import { PrepTab } from "@/features/job/prep";
import { TimelineTab } from "@/features/job/timeline";
import { api } from "@/lib/api/client";
import { keys, useCVs, useJob, usePatchJob } from "@/lib/api/hooks";
import type { Job, Stage } from "@/lib/api/types";
import { formatDate, timeAgo, timeUntil, titleCase } from "@/lib/utils";

const STAGE_OPTIONS: Stage[] = ["new", "scored", "generated", "approved", "applied", "interviewing", "offer", "rejected", "closed"];

function SidePanel({ job, onTab }: { job: Job; onTab: (t: string) => void }) {
  const patch = usePatchJob(job.id);
  const { data: cvs } = useCVs();
  const [runId, setRunId] = React.useState<number | null>(null);
  const [runKind, setRunKind] = React.useState<string | null>(null);
  const run = useRunWatcher(runId, {
    invalidate: [keys.job(job.id), keys.jobPart(job.id, "applications"), keys.jobPart(job.id, "contacts"), keys.jobPart(job.id, "prep"), keys.jobPart(job.id, "events")],
    onDone: () => {
      setRunId(null);
      if (runKind === "generate") onTab("cv");
      if (runKind === "contacts") onTab("contacts");
      if (runKind === "prep") onTab("prep");
    },
    onFail: () => setRunId(null),
  });
  const start = async (kind: string, body: object) => {
    setRunKind(kind);
    setRunId((await api.post<{ run_id: number }>(`/runs/${kind}`, body)).run_id);
  };

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-20">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-5">
          <div className="flex items-center gap-4">
            <ScoreRing score={job.fit_score} size={64} />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Fit score</p>
              <p className="text-sm font-medium">{job.fit_score == null ? "Not scored" : job.fit_score >= 75 ? "Strong match" : job.fit_score >= 50 ? "Worth a look" : "Weak match"}</p>
              {job.similarity != null && <p className="font-mono text-[11px] text-muted-foreground">similarity {job.similarity.toFixed(2)}</p>}
            </div>
            <div className="ml-auto">
              <FeedbackButtons value={job.feedback} onChange={(feedback, reason) => patch.mutate({ feedback, feedback_reason: reason })} />
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">Stage</p>
            <Select value={job.stage} onValueChange={(v) => patch.mutate({ stage: v })}
              options={STAGE_OPTIONS.concat(STAGE_OPTIONS.includes(job.stage) ? [] : [job.stage]).map((s) => ({ value: s, label: titleCase(s) }))} />
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Button size="sm" variant="soft" onClick={() => patch.mutate({ stage: "approved" })} disabled={job.stage === "approved"}><Check /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => patch.mutate({ stage: "rejected" })} disabled={job.stage === "rejected"}><X /> Reject</Button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-muted-foreground">CV used for this job</p>
            <Select value={job.cv_id ? String(job.cv_id) : undefined} placeholder="Default CV"
              onValueChange={(v) => patch.mutate({ cv_id: Number(v) })}
              options={(cvs ?? []).map((c) => ({ value: String(c.id), label: `${c.name}${c.is_default ? " (default)" : ""}` }))} />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" onClick={() => start("generate", { job_ids: [job.id], cv_id: job.cv_id })} loading={!!runId && runKind === "generate"}>
              <Wand2 /> {job.counts.applications ? "Regenerate" : "Generate"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => start("match", { job_ids: [job.id] })} loading={!!runId && runKind === "match"}><RefreshCw /> Re-score</Button>
            <Button size="sm" variant="outline" onClick={() => start("contacts", { job_ids: [job.id] })} loading={!!runId && runKind === "contacts"}><Search /> Find contacts</Button>
            <Button size="sm" variant="outline" onClick={() => start("prep", { job_id: job.id })} loading={!!runId && runKind === "prep"}><GraduationCap /> Prep</Button>
          </div>
          {runId && <RunProgress run={run} />}
        </CardContent>
      </Card>
      {job.next_reminder && (
        <button onClick={() => onTab("timeline")} className="flex cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-left">
          <BellRing className="mt-0.5 size-4 text-warning" />
          <div className="text-sm">
            <p className="font-medium">{job.next_reminder.note}</p>
            <p className="text-xs text-muted-foreground">{timeUntil(job.next_reminder.due_at)} · {formatDate(job.next_reminder.due_at, "EEE d MMM")}</p>
          </div>
        </button>
      )}
    </div>
  );
}

export default function JobPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const { data: job, isLoading, error } = useJob(jobId);
  const [tab, setTab] = React.useState("overview");

  if (isLoading) return <div className="flex flex-col gap-4"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  if (error || !job) return <p className="text-sm text-muted-foreground">Job not found. <Link className="text-primary" href="/jobs">Back to jobs</Link></p>;

  const c = job.counts;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link href="/jobs" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="size-3" /> Jobs</Link>
        <div className="flex flex-wrap items-start gap-4">
          <CompanyLogo company={job.company} domain={job.company_domain} size={52} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{job.company}</span>
              {job.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{job.location}</span>}
              <span>{titleCase(job.source)} · {timeAgo(job.posted_at || job.fetched_at)}</span>
              {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Posting <ExternalLink className="size-3" /></a>}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StageBadge stage={job.stage} />
              <EligibilityChips remote={job.remote_policy} visa={job.visa_sponsorship} ineligible={job.fit && !job.fit.eligible ? job.fit.ineligible_reason : null} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs value={tab} onValueChange={setTab} className="min-w-0">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
            <TabsTrigger value="overview"><LayoutList /> Overview</TabsTrigger>
            <TabsTrigger value="cv"><FileText /> CV{c.applications ? ` · v${c.applications}` : ""}</TabsTrigger>
            <TabsTrigger value="letter"><Mail /> Cover letter</TabsTrigger>
            <TabsTrigger value="contacts"><Users /> Contacts{c.contacts ? ` · ${c.contacts}` : ""}</TabsTrigger>
            <TabsTrigger value="outreach"><Send /> Outreach{c.outreach ? ` · ${c.outreach}` : ""}</TabsTrigger>
            <TabsTrigger value="prep"><GraduationCap /> Prep</TabsTrigger>
            <TabsTrigger value="timeline"><History /> Timeline</TabsTrigger>
          </TabsList>
          <TabsContent value="overview"><Overview job={job} /></TabsContent>
          <TabsContent value="cv"><CvTab job={job} /></TabsContent>
          <TabsContent value="letter"><CoverLetterTab job={job} /></TabsContent>
          <TabsContent value="contacts"><ContactsTab job={job} onDrafted={() => setTab("outreach")} /></TabsContent>
          <TabsContent value="outreach"><OutreachTab job={job} /></TabsContent>
          <TabsContent value="prep"><PrepTab job={job} /></TabsContent>
          <TabsContent value="timeline"><TimelineTab job={job} /></TabsContent>
        </Tabs>
        <SidePanel job={job} onTab={setTab} />
      </div>
    </div>
  );
}
