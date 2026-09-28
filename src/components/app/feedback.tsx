"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlays";
import { Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const REASONS = {
  up: ["Great stack match", "Love the company", "Right seniority", "Good salary"],
  down: ["Wrong stack", "Too senior", "Too junior", "Not interested in domain", "Location doesn't work"],
};

/** 👍/👎 with an optional one-tap reason; reasons become few-shot examples for the ranker. */
export function FeedbackButtons({ value, onChange, size = "icon-sm" }: {
  value: "up" | "down" | null; onChange: (feedback: "up" | "down" | "none", reason?: string) => void; size?: "icon" | "icon-sm";
}) {
  const [open, setOpen] = React.useState<"up" | "down" | null>(null);
  const [custom, setCustom] = React.useState("");
  const pick = (kind: "up" | "down") => {
    if (value === kind) return onChange("none");
    setCustom("");
    setOpen(kind);
  };
  const submit = (kind: "up" | "down", reason?: string) => { onChange(kind, reason); setOpen(null); };

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      {(["up", "down"] as const).map((kind) => (
        <Popover key={kind} open={open === kind} onOpenChange={(o) => setOpen(o ? kind : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size={size} aria-pressed={value === kind} aria-label={kind === "up" ? "Good match" : "Bad match"}
              onClick={(e) => { e.preventDefault(); pick(kind); }}
              className={cn(value === kind && (kind === "up" ? "bg-success/15 text-success" : "bg-destructive/12 text-destructive"))}>
              {kind === "up" ? <ThumbsUp /> : <ThumbsDown />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="end">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Why? (helps future ranking)</p>
            <div className="flex flex-wrap gap-1">
              {REASONS[kind].map((r) => (
                <button key={r} className="cursor-pointer rounded-md border px-2 py-1 text-xs hover:bg-muted" onClick={() => submit(kind, r)}>{r}</button>
              ))}
            </div>
            <form className="mt-2 flex gap-1" onSubmit={(e) => { e.preventDefault(); submit(kind, custom || undefined); }}>
              <Input className="h-8 text-xs" placeholder="Other reason…" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <Button size="sm" type="submit">Save</Button>
            </form>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  );
}
