"use client";

import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

import { api } from "@/lib/api/client";
import { keys } from "@/lib/api/hooks";

export type SaveState = "idle" | "saving" | "saved" | "error";

const DEFAULT_INVALIDATE: QueryKey[] = [keys.me];

/** Local draft that PUTs changed fields to `path` after a pause in typing (and on unmount). */
export function useAutosave<T extends object>(initial: T | undefined, path: string, invalidate: QueryKey[] = DEFAULT_INVALIDATE) {
  const qc = useQueryClient();
  const [edits, setEdits] = React.useState<Partial<T>>({});
  const draft = initial ? ({ ...initial, ...edits } as T) : undefined;
  const [state, setState] = React.useState<SaveState>("idle");
  const pending = React.useRef<Partial<T>>({});
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = React.useRef<() => Promise<void>>(async () => {});

  React.useEffect(() => {
    flushRef.current = async () => {
      const body = pending.current;
      pending.current = {};
      if (!Object.keys(body).length) return;
      setState("saving");
      try {
        await api.put(path, body);
        setState("saved");
        invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      } catch (e) {
        setState("error");
        toast.error((e as Error).message);
      }
    };
  });

  const update = React.useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setEdits((e) => ({ ...e, [key]: value }));
    pending.current = { ...pending.current, [key]: value };
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 700);
  }, []);

  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    flushRef.current();
  }, []);

  return { draft, update, state, flush: () => flushRef.current() };
}
