"use client";

import { format, subMonths } from "date-fns";
import { Coins } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { EmptyState, PageHeader, Stat } from "@/components/app/bits";
import { Progress, Select } from "@/components/ui/overlays";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui/primitives";
import { useUsage } from "@/lib/api/hooks";
import { money, titleCase } from "@/lib/utils";

const months = Array.from({ length: 6 }).map((_, i) => format(subMonths(new Date(), i), "yyyy-MM"));

function Breakdown({ rows, label }: { rows: { key: string; cost: number; calls: number; input_tokens: number; output_tokens: number }[]; label: string }) {
  const max = Math.max(0.0001, ...rows.map((r) => r.cost));
  return (
    <Card>
      <CardHeader><CardTitle>By {label}</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{titleCase(r.key)}</span>
              <span className="font-mono tabular">{money(r.cost, 3)}</span>
            </div>
            <Progress value={(100 * r.cost) / max} />
            <p className="font-mono text-[11px] text-muted-foreground">{r.calls} calls · {(r.input_tokens / 1000).toFixed(1)}k in · {(r.output_tokens / 1000).toFixed(1)}k out</p>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No calls this month.</p>}
      </CardContent>
    </Card>
  );
}

export default function UsagePage() {
  const [month, setMonth] = React.useState(months[0]);
  const { data, isLoading } = useUsage(month);
  const pct = data?.budget ? (100 * data.total.cost) / data.budget : 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="LLM usage" description={<>Every OpenAI call is metered. New runs stop at your monthly budget (<Link href="/settings" className="text-primary hover:underline">change it</Link>).</>}
        actions={<Select value={month} onValueChange={setMonth} className="w-40" options={months.map((m) => ({ value: m, label: format(new Date(`${m}-01T00:00:00`), "MMMM yyyy") }))} />} />
      {isLoading && <Skeleton className="h-64 rounded-xl" />}
      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Spend" value={money(data.total.cost)} hint={data.budget ? `of ${money(data.budget, 0)} budget` : "no budget set"}>
              {data.budget > 0 && <Progress value={pct} indicatorClassName={pct > 80 ? "bg-warning" : undefined} />}
            </Stat>
            <Stat label="Calls" value={data.total.calls.toLocaleString()} />
            <Stat label="Tokens" value={`${((data.total.input_tokens + data.total.output_tokens) / 1000).toFixed(0)}k`}
              hint={`${(data.total.input_tokens / 1000).toFixed(0)}k in · ${(data.total.output_tokens / 1000).toFixed(0)}k out`} />
          </div>
          {!data.total.calls ? <EmptyState icon={Coins} title="No usage this month" /> : (
            <>
              <Card>
                <CardHeader><CardTitle>Daily spend</CardTitle></CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.by_day}>
                      <defs>
                        <linearGradient id="spend" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(8)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis width={44} tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                        <div className="rounded-md border bg-popover px-2 py-1 text-xs shadow-md">{payload[0].payload.day}: <b>{money(payload[0].payload.cost, 3)}</b></div>) : null} />
                      <Area type="monotone" dataKey="cost" stroke="var(--chart-1)" strokeWidth={2} fill="url(#spend)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="grid gap-4 lg:grid-cols-2">
                <Breakdown label="purpose" rows={data.by_purpose.map((r) => ({ ...r, key: r.purpose }))} />
                <Breakdown label="model" rows={data.by_model.map((r) => ({ ...r, key: r.model }))} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
