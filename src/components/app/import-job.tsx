"use client";

import { Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";

import { RunProgress, useRunWatcher } from "./run-watch";

const ImportContext = React.createContext<(url?: string) => void>(() => {});
export const useImportJob = () => React.useContext(ImportContext);

/** Global "Import job from URL" dialog (opened from the dashboard, command palette, jobs page). */
export function ImportJobProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [text, setText] = React.useState("");
  const [paste, setPaste] = React.useState(false);
  const [runId, setRunId] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);

  const run = useRunWatcher(runId, {
    invalidate: [["jobs"]],
    onDone: (r) => {
      const id = (r.result as { job_id?: number } | null)?.job_id;
      toast.success("Job imported and scored");
      setOpen(false);
      setRunId(null);
      if (id) router.push(`/jobs/${id}`);
    },
    onFail: () => { setRunId(null); setPaste(true); },
  });

  const show = React.useCallback((initial?: string) => {
    setUrl(initial ?? ""); setText(""); setPaste(false); setRunId(null); setOpen(true);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post<{ run_id: number }>("/jobs/import", paste ? { text, url: url || null } : { url });
      setRunId(res.run_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ImportContext.Provider value={show}>
      {children}
      <Dialog open={open} onOpenChange={(o) => !runId && setOpen(o)}>
        <DialogContent title="Import a job" description="Paste any posting: LinkedIn, a company careers page, an ATS link.">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Job URL">
              <div className="relative">
                <Link2 className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)}
                  type="url" required={!paste} autoFocus />
              </div>
            </Field>
            {paste ? (
              <Field label="Job description" hint="For pages that need a login: copy the posting text here.">
                <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} required />
              </Field>
            ) : (
              <button type="button" className="-mt-2 cursor-pointer self-start text-xs text-primary hover:underline" onClick={() => setPaste(true)}>
                Page needs a login? Paste the description instead
              </button>
            )}
            {runId && <RunProgress run={run} />}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={!!runId}>Cancel</Button>
              <Button type="submit" loading={busy || !!runId}>Import &amp; score</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ImportContext.Provider>
  );
}

