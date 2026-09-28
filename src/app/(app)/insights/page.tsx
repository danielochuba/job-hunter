"use client";

import { ChartColumn, Trophy } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, PageHeader } from "@/components/app/bits";
import { Select } from "@/components/ui/overlays";
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { useInsights } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";

export default function InsightsPage() {
  const [minFit, setMinFit] = React.useState("60");
  const { data, isLoading } = useInsights(Number(minFit));
  const [selected, setSelected] = React.useState<string | null>(null);
  const skill = data?.missing.find((m) => m.skill === selected) ?? data?.missing[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Skill gaps" description="What good-fit jobs keep asking for that your CV doesn't show yet."
        actions={<Select value={minFit} onValueChange={setMinFit} className="w-44"
          options={[{ value: "40", label: "Jobs with fit ≥ 40" }, { value: "60", label: "Jobs with fit ≥ 60" }, { value: "75", label: "Jobs with fit ≥ 75" }]} />} />
      {isLoading && <Skeleton className="h-96 rounded-xl" />}
      {data && !data.missing.length && (
        <EmptyState icon={ChartColumn} title="Not enough data yet" description="Score some jobs first. Gaps appear once jobs above the fit threshold have been analysed." />
      )}
      {data && data.missing.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Most requested skills you&apos;re missing</CardTitle>
              <CardDescription>Across {data.jobs_considered} jobs with fit ≥ {data.min_fit}. Click a bar for examples.</CardDescription>
            </CardHeader>
            <CardContent style={{ height: Math.max(260, data.missing.length * 30) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.missing} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="skill" width={130} tick={{ fontSize: 12, fill: "var(--foreground)" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload }) => active && payload?.[0] ? (
                    <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
                      {payload[0].payload.skill}: <b>{payload[0].payload.jobs} jobs</b> · avg fit {payload[0].payload.avg_fit}
                    </div>) : null} />
                  <Bar dataKey="jobs" radius={[0, 4, 4, 0]} onClick={(d) => setSelected((d as unknown as { skill: string }).skill)} className="cursor-pointer">
                    {data.missing.map((m) => <Cell key={m.skill} fill={m.skill === skill?.skill ? "var(--chart-1)" : "color-mix(in oklch, var(--chart-1) 45%, transparent)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4">
            {skill && (
              <Card>
                <CardHeader>
                  <CardTitle>{skill.skill}</CardTitle>
                  <CardDescription>Asked for by {skill.jobs} good-fit jobs (avg fit {skill.avg_fit}). Learning it, or adding real experience to your CV, would lift these.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1">
                  {skill.examples.map((e) => (
                    <Link key={e.id} href={`/jobs/${e.id}`} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                      <span className="truncate">{e.title} <span className="text-muted-foreground">· {e.company}</span></span>
                      <span className="font-mono text-xs">{e.fit_score}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Trophy className="size-4 text-warning" /> Your most in-demand skills</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {data.strengths.map((s, i) => (
                  <Badge key={s.skill} variant="success" className={cn(i < 3 && "text-xs")}>{s.skill} · {s.jobs}</Badge>
                ))}
                {!data.strengths.length && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
