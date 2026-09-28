"use client";

import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { Progress } from "@/components/ui/overlays";
import { keys, useRun } from "@/lib/api/hooks";
import type { Run } from "@/lib/api/types";

/** Poll a run until it finishes, then call onDone/onFail once. */
export function useRunWatcher(runId: number | null, { onDone, onFail, invalidate = [] }: {
  onDone?: (run: Run) => void; onFail?: (run: Run) => void; invalidate?: readonly (readonly unknown[])[];
} = {}) {
  const qc = useQueryClient();
  const { data: run } = useRun(runId);
  const handled = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!run || handled.current === run.id || !["succeeded", "failed"].includes(run.status)) return;
    handled.current = run.id;
    invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    qc.invalidateQueries({ queryKey: keys.activeRuns });
    qc.invalidateQueries({ queryKey: keys.stats });
    if (run.status === "succeeded") onDone?.(run);
    else {
      toast.error(`${run.kind} failed`, { description: run.error ?? undefined });
      onFail?.(run);
    }
  }, [run, onDone, onFail, invalidate, qc]);
  return run;
}

function useElapsed(since: string | undefined, active: boolean) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);
  return since ? Math.max(0, Math.round((now - new Date(since).getTime()) / 1000)) : 0;
}

export function RunProgress({ run, slowHint = "LLM calls can take a minute or two." }: { run?: Run; slowHint?: string }) {
  const active = !!run && ["queued", "running"].includes(run.status);
  const elapsed = useElapsed(run?.started_at, active);
  if (!run) return null;
  const { done, total, label } = run.progress || { done: 0, total: 0 };
  // Single-step runs (e.g. one LLM call) have no meaningful fraction: show an indeterminate bar.
  const indeterminate = active && total <= 1;
  const pct = total ? (100 * done) / total : run.status === "succeeded" ? 100 : 0;
  const time = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
  return (
    <div className="flex flex-col gap-1.5">
      {indeterminate ? (
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Working">
          <div className="absolute inset-y-0 w-1/3 animate-[indeterminate_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
      ) : (
        <Progress value={pct} indicatorClassName={run.status === "failed" ? "bg-destructive" : undefined} />
      )}
      <p className="truncate text-xs text-muted-foreground">
        {run.status === "failed" ? run.error : label || (run.status === "succeeded" ? "Done" : "Working…")}
        {total > 1 ? ` · ${done}/${total}` : ""}
        {active && ` · ${time}`}
      </p>
      {active && elapsed > 20 && <p className="text-[11px] text-muted-foreground/80">Still working. {slowHint}</p>}
    </div>
  );
}
