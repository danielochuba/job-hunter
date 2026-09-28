"use client";

import { CircleCheck, CircleX, ExternalLink, Info, TriangleAlert } from "lucide-react";

import { EligibilityChips } from "@/components/app/bits";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import type { Job } from "@/lib/api/types";

function List({ title, items, icon: Icon, tone }: { title: string; items: string[]; icon: typeof Info; tone: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((x, i) => (
          <li key={i} className="flex gap-2 text-sm"><Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} />{x}</li>
        ))}
      </ul>
    </div>
  );
}

export function Overview({ job }: { job: Job }) {
  const fit = job.fit;
  return (
    <div className="flex flex-col gap-4">
      {fit && (
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Why it matches</CardTitle>
              <p className="mt-1.5 text-sm leading-relaxed">{fit.summary}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2">
            <List title="Matched" items={fit.matched_requirements} icon={CircleCheck} tone="text-success" />
            <List title="Gaps" items={fit.gaps} icon={Info} tone="text-warning" />
            <List title="Dealbreakers" items={fit.dealbreakers} icon={CircleX} tone="text-destructive" />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Signals</p>
              <EligibilityChips remote={job.remote_policy} visa={job.visa_sponsorship} ineligible={fit.eligible ? null : fit.ineligible_reason} />
              {fit.location_restrictions?.length > 0 && (
                <p className="text-sm"><span className="text-muted-foreground">Restricted to:</span> {fit.location_restrictions.join(", ")}</p>
              )}
              {(job.salary || fit.salary) && <p className="font-mono text-sm">{job.salary || fit.salary}</p>}
              {fit.seniority && <p className="text-sm"><span className="text-muted-foreground">Seniority:</span> {fit.seniority}</p>}
              {fit.missing_skills?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {fit.required_skills.map((s) => (
                    <Badge key={s} variant={fit.missing_skills.includes(s) ? "warning" : "success"}>{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      {!fit && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <TriangleAlert className="size-4" /> Not scored yet. Run “Re-score” from the panel to analyse the fit.
        </div>
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Job description</CardTitle>
          {job.url && (
            <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Original posting <ExternalLink className="size-3" />
            </a>
          )}
        </CardHeader>
        <CardContent>
          <div className="max-h-[36rem] overflow-y-auto pr-2 text-sm leading-relaxed whitespace-pre-line text-foreground/90 scrollbar-thin">
            {job.description || "No description."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
