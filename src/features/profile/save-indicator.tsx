"use client";

import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import type { SaveState } from "./use-autosave";

export function SaveIndicator({ state }: { state: SaveState }) {
  const map = {
    idle: null,
    saving: <><LoaderCircle className="size-3.5 animate-spin" /> Saving…</>,
    saved: <><CircleCheck className="size-3.5 text-success" /> All changes saved</>,
    error: <><TriangleAlert className="size-3.5 text-destructive" /> Not saved</>,
  };
  return <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">{map[state]}</span>;
}
