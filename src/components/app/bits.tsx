"use client";

/* Small domain-flavoured display components used across pages. */
import { Building2, Globe, House, Plane, TriangleAlert } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Badge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/overlays";
import type { Stage } from "@/lib/api/types";
import { cn, initials, titleCase } from "@/lib/utils";

export function scoreTone(score: number | null | undefined) {
  if (score == null) return "text-muted-foreground";
  return score >= 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
}

/** Fit score as a ring; the number is always shown so colour is never the only signal. */
export function ScoreRing({ score, size = 44, className }: { score: number | null | undefined; size?: number; className?: string }) {
  const s = score ?? 0;
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", scoreTone(score), className)}
      style={{ width: size, height: size }} role="img" aria-label={score == null ? "Not scored" : `Fit score ${s} of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={4} />
        {score != null && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - s / 100)} className="transition-[stroke-dashoffset] duration-700" />
        )}
      </svg>
      <span className="absolute font-mono text-xs font-semibold tabular" style={{ fontSize: size < 36 ? 10 : undefined }}>
        {score ?? "–"}
      </span>
    </div>
  );
}

const STAGE_STYLE: Partial<Record<Stage, string>> = {
  new: "bg-muted text-muted-foreground", filtered_out: "bg-muted text-muted-foreground",
  ineligible: "bg-destructive/10 text-destructive", scored: "bg-accent text-accent-foreground",
  generated: "bg-chart-2/15 text-chart-2", approved: "bg-primary/15 text-primary", rejected: "bg-muted text-muted-foreground line-through",
  applied: "bg-chart-4/20 text-warning", interviewing: "bg-chart-5/15 text-chart-5", offer: "bg-success/15 text-success",
  closed: "bg-muted text-muted-foreground",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", STAGE_STYLE[stage])}>{titleCase(stage)}</span>;
}

export function EligibilityChips({ remote, visa, ineligible, compact }: {
  remote?: string | null; visa?: string | null; ineligible?: string | null; compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {ineligible && (
        <Tooltip content={ineligible}>
          <Badge variant="destructive"><TriangleAlert /> {compact ? "Ineligible" : ineligible}</Badge>
        </Tooltip>
      )}
      {remote && remote !== "unknown" && (
        <Badge variant={remote === "remote" ? "success" : "muted"}>
          {remote === "remote" ? <Globe /> : <House />} {titleCase(remote)}
        </Badge>
      )}
      {visa && visa !== "unknown" && (
        <Tooltip content={visa === "yes" ? "Visa sponsorship mentioned" : "Says no visa sponsorship"}>
          <Badge variant={visa === "yes" ? "success" : "warning"}><Plane /> Visa {visa === "yes" ? "✓" : "✗"}</Badge>
        </Tooltip>
      )}
    </div>
  );
}

/** Company logo via Clearbit with an initials fallback. */
export function CompanyLogo({ company, domain, size = 36, className }: { company: string; domain?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const style = { width: size, height: size };
  if (domain && !failed) {
    return (
      <Image src={`https://logo.clearbit.com/${domain}`} alt="" width={size} height={size} unoptimized onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-lg border bg-white object-contain p-0.5", className)} style={style} />
    );
  }
  const hue = [...company].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold", className)}
      style={{ ...style, background: `oklch(0.93 0.04 ${hue})`, color: `oklch(0.4 0.1 ${hue})` }} aria-hidden>
      {company ? initials(company.replace(/[-_]/g, " ")) : <Building2 className="size-4" />}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center", className)}>
      <div className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="size-5" /></div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Editable list of short strings (skills, queries, regions...). */
export function ChipInput({ value, onChange, placeholder, className }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string; className?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean).filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  return (
    <div className={cn("flex min-h-9 flex-wrap items-center gap-1 rounded-lg border border-input bg-card px-2 py-1 shadow-xs focus-within:outline-2 focus-within:outline-ring/60", className)}>
      {value.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">
          {v}
          <button type="button" className="cursor-pointer opacity-60 hover:opacity-100" aria-label={`Remove ${v}`}
            onClick={() => onChange(value.filter((x) => x !== v))}>×</button>
        </span>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={value.length ? "" : placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
          if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add} className="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

export function Stat({ label, value, hint, icon: Icon, className, children }: {
  label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ComponentType<{ className?: string }>;
  className?: string; children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-xs", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {Icon && <Icon className="size-4" />}
      </div>
      <div className="font-mono text-2xl font-semibold tracking-tight tabular">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      {children}
    </div>
  );
}
