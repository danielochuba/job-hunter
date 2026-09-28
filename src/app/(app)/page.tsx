"use client";

import {
  ArrowUpRight, BellRing, Briefcase, Inbox, Link2, MailCheck, Play, Sparkles, Target, TrendingUp, Wand2,
} from "lucide-react";
import Link from "next/link";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";

import { CompanyLogo, EmptyState, EligibilityChips, PageHeader, ScoreRing, Stat } from "@/components/app/bits";
import { useImportJob } from "@/components/app/import-job";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { useMe, useStartRun, useStats } from "@/lib/api/hooks";
import { cn, greeting, timeAgo, timeUntil, titleCase } from "@/lib/utils";

function ChartTip({ active, payload, label, unit = "" }: { active?: boolean; payload?: { value: number }[]; label?: string; unit?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow-md">
      <span className="text-muted-foreground">{label}</span> · <span className="font-mono font-medium">{payload[0].value}{unit}</span>
    </div>
  );
}

export default function Dashboard() {
  const { data: me } = useMe();
  const { data: s, isLoading } = useStats();
  const startRun = useStartRun();
  const importJob = useImportJob();
  const name = me?.preferred_name || me?.first_name;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={<>{greeting()}{name ? `, ${name}` : ""} 👋</>}
        description={s ? `${s.kpis.new_today} new jobs today · ${s.kpis.strong_matches} strong matches waiting for you` : "Here's your job search at a glance."}
        actions={<>
          <Button variant="outline" onClick={() => importJob()}><Link2 /> Import job</Button>
          <Button variant="outline" onClick={() => startRun.mutate({ kind: "collect" })} loading={startRun.isPending && startRun.variables?.kind === "collect"}>
            <Play /> Collect
          </Button>
          <Button onClick={() => startRun.mutate({ kind: "match" })} loading={startRun.isPending && startRun.variables?.kind === "match"}>
            <Wand2 /> Match &amp; score
          </Button>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading || !s ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />) : <>
          <Stat label="New this week" value={s.kpis.new_week} icon={Briefcase} hint={`${s.kpis.new_today} today`}>
            <div className="-mx-1 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.daily}>
                  <defs>
                    <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="jobs" stroke="var(--chart-1)" strokeWidth={1.5} fill="url(#spark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Stat>
          <Stat label="Strong matches" value={s.kpis.strong_matches} icon={Target} hint={`avg fit ${s.kpis.avg_fit ?? "–"}`} />
          <Stat label="Emails sent" value={s.kpis.emails_sent} icon={MailCheck}
            hint={<span className={cn(s.kpis.replies > 0 && "text-success")}>{s.kpis.replies} replies</span>} />
          <Stat label="Reminders due" value={s.kpis.reminders_due} icon={BellRing} hint="today or overdue"
            className={cn(s.kpis.reminders_due > 0 && "border-warning/40")} />
        </>}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Top matches</CardTitle>
              <CardDescription>Best-fitting jobs you haven&apos;t acted on yet</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm"><Link href="/jobs?stage=scored,generated">View all <ArrowUpRight /></Link></Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 px-2">
            {isLoading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="mx-3 my-1 h-12" />)}
            {s && !s.top.length && (
              <EmptyState icon={Sparkles} title="No scored jobs yet"
                description="Collect jobs from your sources, then run Match to rank them against your CV."
                action={<Button size="sm" onClick={() => startRun.mutate({ kind: "collect" })}><Play /> Collect jobs</Button>} className="mx-3" />
            )}
            {s?.top.map((j) => (
              <Link key={j.id} href={`/jobs/${j.id}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted">
                <CompanyLogo company={j.company} domain={j.company_domain} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover:text-primary">{j.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{j.company} · {j.location || "—"}</p>
                </div>
                <div className="hidden sm:block"><EligibilityChips remote={j.remote_policy} visa={j.visa_sponsorship} /></div>
                <ScoreRing score={j.fit_score} size={38} />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Today</CardTitle><CardDescription>Things that need you</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-4">
            {s?.replies.map((r) => (
              <Link key={r.id} href={`/jobs/${r.job_id}`} className="flex gap-3 rounded-lg border border-success/30 bg-success/5 p-3 hover:bg-success/10">
                <Inbox className="mt-0.5 size-4 shrink-0 text-success" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium">Reply from {r.company}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{r.reply_snippet}</p>
                </div>
              </Link>
            ))}
            {s?.reminders.map((r) => (
              <Link key={r.id} href={r.job_id ? `/jobs/${r.job_id}` : "/tracker"} className="flex gap-3 rounded-lg p-2 hover:bg-muted">
                <BellRing className={cn("mt-0.5 size-4 shrink-0", new Date(r.due_at) < new Date() ? "text-warning" : "text-muted-foreground")} />
                <div className="min-w-0 text-sm">
                  <p className="truncate">{r.note}</p>
                  <p className="text-xs text-muted-foreground">{timeUntil(r.due_at)}</p>
                </div>
              </Link>
            ))}
            {s && !s.replies.length && !s.reminders.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing urgent. Nice.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Pipeline</CardTitle><CardDescription>How far jobs get</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {s?.funnel.map((f, i) => {
              const max = Math.max(1, s.funnel[0].n);
              return (
                <div key={f.stage} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-muted-foreground">{titleCase(f.stage)}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-muted">
                    <div className="flex h-full items-center rounded-md px-2 font-mono text-xs text-primary-foreground transition-all duration-700"
                      style={{ width: `${Math.max(8, (100 * f.n) / max)}%`, background: `color-mix(in oklch, var(--primary) ${100 - i * 12}%, var(--chart-2))` }}>
                      {f.n}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Jobs collected</CardTitle><CardDescription>Last 14 days</CardDescription></CardHeader>
          <CardContent className="h-52">
            {s && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.daily.map((d) => ({ ...d, label: d.day.slice(5) }))}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} interval={1} />
                  <YAxis width={28} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <ChartTooltip cursor={{ fill: "var(--muted)" }} content={<ChartTip unit=" jobs" />} />
                  <Bar dataKey="jobs" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Recent activity</CardTitle><CardDescription>Across all jobs</CardDescription></div>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ol className="relative flex flex-col gap-3 border-l pl-4">
              {s?.activity.slice(0, 7).map((e) => (
                <li key={e.id} className="text-sm">
                  <span className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-card bg-primary" />
                  <Link href={`/jobs/${e.job_id}`} className="hover:text-primary">
                    <span className="font-medium">{e.company}</span> <span className="text-muted-foreground">· {e.note}</span>
                  </Link>
                  <p className="text-[11px] text-muted-foreground">{timeAgo(e.at)}</p>
                </li>
              ))}
              {s && !s.activity.length && <li className="text-sm text-muted-foreground">No activity yet.</li>}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
