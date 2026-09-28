"use client";

import { CircleCheck, CircleX, History, LoaderCircle, Play, Wand2 } from "lucide-react";
import * as React from "react";

import { EmptyState, PageHeader } from "@/components/app/bits";
import { RunProgress } from "@/components/app/run-watch";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, Skeleton } from "@/components/ui/primitives";
import { useRun, useRuns, useStartRun } from "@/lib/api/hooks";
import type { Run } from "@/lib/api/types";
import { cn, formatDate, money, timeAgo, titleCase } from "@/lib/utils";

function duration(r: Run) {
  const end = r.finished_at ? new Date(r.finished_at).getTime() : Date.now();
  const s = Math.round((end - new Date(r.started_at).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function StatusIcon({ status }: { status: Run["status"] }) {
  if (status === "succeeded") return <CircleCheck className="size-4 text-success" />;
  if (status === "failed") return <CircleX className="size-4 text-destructive" />;
  return <LoaderCircle className="size-4 animate-spin text-primary" />;
}

function RunLog({ id }: { id: number }) {
  const { data: run } = useRun(id);
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [run?.log?.length]);
  if (!run) return <Skeleton className="h-40" />;
  return (
    <div className="flex flex-col gap-3">
      {run.status === "running" && <RunProgress run={run} />}
      {run.error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{run.error}</p>}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Trigger: {run.trigger}</span>·<span>LLM cost: {money(run.cost_usd, 4)}</span>
        {run.result && <>·<span className="font-mono">{JSON.stringify(run.result).slice(0, 160)}</span></>}
      </div>
      <pre ref={ref} className="max-h-96 overflow-auto rounded-lg bg-muted p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap scrollbar-thin">
        {run.log?.length ? run.log.join("\n") : "No log output."}
      </pre>
    </div>
  );
}

export default function RunsPage() {
  const { data: runs, isLoading } = useRuns();
  const startRun = useStartRun();
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Runs" description="Background tasks from the app, the CLI and the daily schedule."
        actions={<>
          <Button variant="outline" onClick={() => startRun.mutate({ kind: "collect" })}><Play /> Collect</Button>
          <Button variant="outline" onClick={() => startRun.mutate({ kind: "match" })}><Wand2 /> Match</Button>
          <Button onClick={() => startRun.mutate({ kind: "daily" })}>Run daily routine</Button>
        </>} />
      {isLoading && <Skeleton className="h-96 rounded-xl" />}
      {runs && !runs.length && <EmptyState icon={History} title="No runs yet" description="Start a collect to fetch your first jobs." />}
      {!!runs?.length && (
        <Card>
          <CardContent className="divide-y p-0">
            {runs.map((r) => (
              <div key={r.id}>
                <button onClick={() => setOpen(open === r.id ? null : r.id)}
                  className={cn("flex w-full cursor-pointer items-center gap-4 px-5 py-3 text-left text-sm hover:bg-muted/50", open === r.id && "bg-muted/50")}>
                  <StatusIcon status={r.status} />
                  <span className="w-24 font-medium">{titleCase(r.kind)}</span>
                  <Badge variant="outline">{r.trigger}</Badge>
                  <span className="hidden min-w-0 flex-1 truncate text-muted-foreground sm:block">
                    {r.status === "failed" ? r.error : r.progress?.label || (r.status === "succeeded" ? `${r.log_lines ?? 0} log lines` : "…")}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground tabular">{duration(r)}</span>
                  <span className="w-28 text-right text-xs text-muted-foreground" title={formatDate(r.started_at, "PPpp")}>{timeAgo(r.started_at)}</span>
                </button>
                {open === r.id && <div className="border-t bg-card px-5 py-4"><RunLog id={r.id} /></div>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
