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

export function RunProgress({ run }: { run?: Run }) {
  if (!run) return null;
  const { done, total, label } = run.progress || { done: 0, total: 0 };
  const pct = total ? (100 * done) / total : run.status === "succeeded" ? 100 : 8;
  return (
    <div className="flex flex-col gap-1.5">
      <Progress value={pct} indicatorClassName={run.status === "failed" ? "bg-destructive" : undefined} />
      <p className="truncate text-xs text-muted-foreground">
        {run.status === "failed" ? run.error : label || (run.status === "succeeded" ? "Done" : "Working…")}
        {total ? ` · ${done}/${total}` : ""}
      </p>
    </div>
  );
}
