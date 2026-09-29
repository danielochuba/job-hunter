"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy, PenLine, RefreshCw, Save, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Confirm, Select } from "@/components/ui/overlays";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Skeleton, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useAnswers } from "@/lib/api/hooks";
import type { FormAnswer, Job } from "@/lib/api/types";
import { cn, timeAgo, wordCount } from "@/lib/utils";

const PRESETS = [
  { label: "Message to the recruiter", text: "Message to the recruiter: a short, specific message about what I have built and why this role." },
  { label: "Why this company?", text: "Why do you want to work at this company?" },
  { label: "Why this role?", text: "Why are you interested in this role, and why are you a good fit?" },
  { label: "Project you're proud of", text: "Tell us about a project you're proud of: what you built, your role, and the impact." },
  { label: "Relevant experience", text: "Describe your most relevant experience for this position." },
  { label: "Short intro / bio", text: "Introduce yourself in a few sentences." },
  { label: "Anything else?", text: "Is there anything else you'd like us to know?" },
];
const LENGTHS = [50, 100, 150, 250, 400].map((n) => ({ value: String(n), label: `≤ ${n} words` }));
const TONES = [
  { value: "direct", label: "Direct" }, { value: "warm", label: "Warm" },
  { value: "formal", label: "Formal" }, { value: "enthusiastic", label: "Enthusiastic" },
];

function AnswerCard({ a, job, onRegenerate, regenerating }: {
  a: FormAnswer; job: Job; onRegenerate: (a: FormAnswer) => void; regenerating: boolean;
}) {
  const qc = useQueryClient();
  const [text, setText] = React.useState(a.answer);
  const [saving, setSaving] = React.useState(false);
  const words = wordCount(text);
  const dirty = text !== a.answer;
  const refresh = () => qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "answers") });
  const save = async () => {
    setSaving(true);
    try { await api.put(`/answers/${a.id}`, { answer: text }); toast.success("Saved"); refresh(); }
    catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };
  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-start gap-3">
          <p className="min-w-0 flex-1 text-sm font-medium">{a.question}</p>
          <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.created_at)}</span>
        </div>
        <p className="text-xs text-muted-foreground">≤ {a.max_words} words · {a.tone}{a.emphasis ? ` · emphasise: ${a.emphasis}` : ""}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea rows={Math.min(14, Math.max(5, Math.ceil(text.length / 90)))} value={text} onChange={(e) => setText(e.target.value)}
          className="text-[15px] leading-7" />
        {!!a.evidence_text?.length && (
          <details className="text-xs text-muted-foreground">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-success"><ShieldCheck className="size-3.5" /> Based on {a.evidence_text.length} bullet(s) from your CV</summary>
            <ul className="mt-2 flex flex-col gap-1 pl-5">
              {a.evidence_text.map((e) => <li key={e.id} className="list-disc"><span className="font-mono">{e.id}</span>: {e.text}</li>)}
            </ul>
          </details>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("font-mono text-xs tabular", words > a.max_words ? "text-warning" : "text-muted-foreground")}>
            {words} / {a.max_words} words
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Confirm title="Delete this answer?" destructive confirmLabel="Delete"
              onConfirm={async () => { await api.del(`/answers/${a.id}`); refresh(); }}
              trigger={<Button size="sm" variant="ghost" aria-label="Delete answer"><Trash2 /></Button>} />
            <Button size="sm" variant="outline" onClick={() => onRegenerate(a)} loading={regenerating}><RefreshCw /> Another version</Button>
            {dirty && <Button size="sm" variant="outline" onClick={save} loading={saving}><Save /> Save edit</Button>}
            <Button size="sm" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied. Paste it into the form"); }}>
              <Copy /> Copy
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function WriteTab({ job }: { job: Job }) {
  const qc = useQueryClient();
  const { data: answers, isLoading } = useAnswers(job.id);
  const [question, setQuestion] = React.useState("");
  const [maxWords, setMaxWords] = React.useState("150");
  const [tone, setTone] = React.useState("direct");
  const [emphasis, setEmphasis] = React.useState("");
  const [busy, setBusy] = React.useState<number | "new" | null>(null);

  const generate = async (body: { question: string; max_words: number; tone: string; emphasis?: string | null }, key: number | "new") => {
    setBusy(key);
    try {
      await api.post<FormAnswer>("/answers", { job_id: job.id, ...body });
      await qc.invalidateQueries({ queryKey: keys.jobPart(job.id, "answers") });
      if (key === "new") toast.success("Answer ready");
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PenLine className="size-4 text-primary" /> Write an answer for this application</CardTitle>
          <p className="text-xs text-muted-foreground">
            Paste the form&apos;s question or instructions. The answer uses only facts from your CV, follows the posting&apos;s own instructions, and is specific to {job.company}.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setQuestion(p.text)}
                className={cn("cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors hover:bg-muted", question === p.text && "border-primary bg-accent text-accent-foreground")}>
                {p.label}
              </button>
            ))}
          </div>
          <Field label="Question / instructions from the form">
            <Textarea rows={4} value={question} onChange={(e) => setQuestion(e.target.value)}
              placeholder={"e.g. “Message to the recruiter. No cover letter template, please. Tell us what you have built and why this role.”"} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr]">
            <Field label="Length"><Select value={maxWords} onValueChange={setMaxWords} options={LENGTHS} /></Field>
            <Field label="Tone"><Select value={tone} onValueChange={setTone} options={TONES} /></Field>
            <Field label="Emphasise (optional)"><Input value={emphasis} onChange={(e) => setEmphasis(e.target.value)} placeholder="e.g. my AI voice agent work, Node.js" /></Field>
          </div>
          <Button className="self-end" disabled={!question.trim()} loading={busy === "new"}
            onClick={() => generate({ question, max_words: Number(maxWords), tone, emphasis: emphasis || null }, "new")}>
            <Sparkles /> Write it
          </Button>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-40 rounded-xl" />}
      {!isLoading && !answers?.length && (
        <EmptyState icon={PenLine} title="No answers yet"
          description="Application forms often ask for a short message instead of a cover letter. Write one above; it's saved here for this job." />
      )}
      {answers?.map((a) => (
        <AnswerCard key={`${a.id}-${a.updated_at}`} a={a} job={job} regenerating={busy === a.id}
          onRegenerate={(x) => generate({ question: x.question, max_words: x.max_words, tone: x.tone, emphasis: x.emphasis }, x.id)} />
      ))}
    </div>
  );
}
