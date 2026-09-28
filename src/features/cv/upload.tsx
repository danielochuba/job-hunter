"use client";

import { useQueryClient } from "@tanstack/react-query";
import { FileUp, UploadCloud } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { RunProgress, useRunWatcher } from "@/components/app/run-watch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys } from "@/lib/api/hooks";
import type { CVDetail, MasterCV, ParsedCV } from "@/lib/api/types";
import { cn, titleCase } from "@/lib/utils";

import { CvEditor } from "./cv-editor";

const ACCEPT = ".pdf,.docx,.md,.markdown,.txt,.json,.yaml,.yml";

export function UploadZone({ onParsed, compact }: { onParsed: (p: ParsedCV) => void; compact?: boolean }) {
  const [runId, setRunId] = React.useState<number | null>(null);
  const [drag, setDrag] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);
  const run = useRunWatcher(runId, {
    onDone: (r) => { setRunId(null); onParsed(r.result as unknown as ParsedCV); },
    onFail: () => setRunId(null),
  });
  const upload = async (file?: File) => {
    if (!file) return;
    try { setRunId((await api.upload<{ run_id: number }>("/cvs/upload", file)).run_id); }
    catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]); }}
      className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-card text-center transition-colors",
        compact ? "p-6" : "p-10", drag && "border-primary bg-accent/40")}>
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground"><UploadCloud className="size-6" /></div>
      {runId ? (
        <div className="w-full max-w-sm"><p className="mb-2 text-sm font-medium">Reading your CV…</p><RunProgress run={run} /></div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium">Drop your CV here</p>
            <p className="text-xs text-muted-foreground">PDF, Word, Markdown, text, JSON or YAML. Every role and bullet is kept; nothing is invented.</p>
          </div>
          <Button onClick={() => input.current?.click()}><FileUp /> Choose file</Button>
        </>
      )}
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files?.[0] ?? undefined)} />
    </div>
  );
}

export function ReviewParsed({ parsed, onDone, onCancel }: { parsed: ParsedCV; onDone: (cv: CVDetail) => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [cv, setCv] = React.useState<MasterCV>(parsed.cv);
  const [name, setName] = React.useState(parsed.filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
  const [saving, setSaving] = React.useState(false);
  const contactFields = Object.entries(parsed.contact || {}).filter(([, v]) => v);
  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.post<CVDetail>("/cvs", { name, cv, raw_text: parsed.raw_text, source_file: parsed.source_file, contact: parsed.contact });
      toast.success("CV saved", { description: "It will be embedded on the next match run." });
      qc.invalidateQueries({ queryKey: keys.cvs });
      qc.invalidateQueries({ queryKey: keys.me });
      onDone(saved);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-primary/30 bg-accent/30">
        <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-end">
          <Field label="Name this CV" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Backend, Full-stack" /></Field>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={save} loading={saving} disabled={!name.trim()}>Save CV</Button>
          </div>
        </CardContent>
        {contactFields.length > 0 && (
          <CardContent className="text-xs text-muted-foreground">
            Found contact details ({contactFields.map(([k]) => titleCase(k)).join(", ")}). They&apos;ll fill any empty fields on your profile.
          </CardContent>
        )}
      </Card>
      <p className="text-sm text-muted-foreground">Check everything was captured correctly: this is the only source the tailoring may use.</p>
      <CvEditor value={cv} onChange={setCv} />
    </div>
  );
}
