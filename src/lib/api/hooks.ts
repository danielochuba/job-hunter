"use client";

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "./client";
import type {
  Application, Company, Contact, CVDetail, CVSummary, GmailStatus, Job, JobListItem, Notification, Outreach, Page,
  PrepPack, Reminder, Run, Settings, SkillGaps, Stats, TimelineEvent, TrackerCard, UsageReport, UserProfile,
} from "./types";

export const keys = {
  me: ["me"] as const,
  stats: ["stats"] as const,
  jobs: (params: object) => ["jobs", params] as const,
  job: (id: number) => ["job", id] as const,
  jobPart: (id: number, part: string) => ["job", id, part] as const,
  runs: ["runs"] as const,
  run: (id: number) => ["run", id] as const,
  activeRuns: ["runs", "active"] as const,
  cvs: ["cvs"] as const,
  cv: (id: number) => ["cv", id] as const,
  settings: ["settings"] as const,
  companies: ["companies"] as const,
  notifications: ["notifications"] as const,
  tracker: ["tracker"] as const,
  reminders: ["reminders"] as const,
  insights: (minFit: number) => ["insights", minFit] as const,
  usage: (month?: string) => ["usage", month ?? "current"] as const,
  gmail: ["gmail"] as const,
};

function errorToast(e: unknown) {
  toast.error(e instanceof Error ? e.message : "Something went wrong");
}

/** Mutation that toasts errors and invalidates the given query keys on success. */
export function useAction<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, opts: {
  invalidate?: QueryKey[]; success?: string | ((r: TResult) => string); onSuccess?: (r: TResult, args: TArgs) => void;
} = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onError: errorToast,
    onSuccess: (r, args) => {
      opts.invalidate?.forEach((k) => qc.invalidateQueries({ queryKey: k }));
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success);
      opts.onSuccess?.(r, args);
    },
  });
}

// ---------------------------------------------------------------- reads

export const useMe = () => useQuery({ queryKey: keys.me, queryFn: () => api.get<UserProfile>("/me") });
export const useStats = () => useQuery({ queryKey: keys.stats, queryFn: () => api.get<Stats>("/stats"), refetchInterval: 60_000 });

export interface JobQuery {
  stage?: string; min_fit?: number; source?: string; q?: string; feedback?: string; sort?: string; page?: number; page_size?: number;
}
export const useJobs = (params: JobQuery) =>
  useQuery({ queryKey: keys.jobs(params), queryFn: () => api.get<Page<JobListItem>>("/jobs", { ...params }), placeholderData: (p) => p });
export const useJobSources = () => useQuery({ queryKey: ["jobs", "sources"], queryFn: () => api.get<{ source: string; n: number }[]>("/jobs/sources") });
export const useJob = (id: number) => useQuery({ queryKey: keys.job(id), queryFn: () => api.get<Job>(`/jobs/${id}`) });
export const useApplications = (id: number) =>
  useQuery({ queryKey: keys.jobPart(id, "applications"), queryFn: () => api.get<Application[]>(`/jobs/${id}/applications`) });
export const useContacts = (id: number) =>
  useQuery({ queryKey: keys.jobPart(id, "contacts"), queryFn: () => api.get<Contact[]>(`/jobs/${id}/contacts`) });
export const useOutreach = (id: number) =>
  useQuery({ queryKey: keys.jobPart(id, "outreach"), queryFn: () => api.get<Outreach[]>(`/jobs/${id}/outreach`) });
export const useEvents = (id: number) =>
  useQuery({ queryKey: keys.jobPart(id, "events"), queryFn: () => api.get<TimelineEvent[]>(`/jobs/${id}/events`) });
export const usePrep = (id: number) =>
  useQuery({ queryKey: keys.jobPart(id, "prep"), queryFn: () => api.get<PrepPack | null>(`/jobs/${id}/prep`) });

export const useRuns = () => useQuery({ queryKey: keys.runs, queryFn: () => api.get<Run[]>("/runs", { limit: 50 }), refetchInterval: 5000 });
export const useActiveRuns = () =>
  useQuery({ queryKey: keys.activeRuns, queryFn: () => api.get<Run[]>("/runs/active"),
             refetchInterval: (q) => ((q.state.data?.length ?? 0) > 0 ? 2000 : 10_000) });
export const useRun = (id: number | null) =>
  useQuery({ queryKey: keys.run(id ?? 0), queryFn: () => api.get<Run>(`/runs/${id}`), enabled: !!id,
             refetchInterval: (q) => (q.state.data && ["succeeded", "failed"].includes(q.state.data.status) ? false : 1500) });

export const useCVs = () => useQuery({ queryKey: keys.cvs, queryFn: () => api.get<CVSummary[]>("/cvs") });
export const useCV = (id: number) => useQuery({ queryKey: keys.cv(id), queryFn: () => api.get<CVDetail>(`/cvs/${id}`) });
export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: () => api.get<Settings>("/settings") });
export const useCompanies = () => useQuery({ queryKey: keys.companies, queryFn: () => api.get<Company[]>("/companies") });
export const useNotifications = () =>
  useQuery({ queryKey: keys.notifications, queryFn: () => api.get<{ items: Notification[]; unread: number }>("/notifications"),
             refetchInterval: 30_000 });
export const useTracker = () => useQuery({ queryKey: keys.tracker, queryFn: () => api.get<{ columns: { stage: string; jobs: TrackerCard[] }[] }>("/tracker") });
export const useReminders = () => useQuery({ queryKey: keys.reminders, queryFn: () => api.get<Reminder[]>("/reminders") });
export const useInsights = (minFit: number) => useQuery({ queryKey: keys.insights(minFit), queryFn: () => api.get<SkillGaps>("/insights/skills", { min_fit: minFit }) });
export const useUsage = (month?: string) => useQuery({ queryKey: keys.usage(month), queryFn: () => api.get<UsageReport>("/usage", { month }) });
export const useGmail = () => useQuery({ queryKey: keys.gmail, queryFn: () => api.get<GmailStatus>("/gmail/status") });

// ---------------------------------------------------------------- common writes

export function useStartRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, body }: { kind: string; body?: object }) => api.post<{ run_id: number }>(`/runs/${kind}`, body ?? {}),
    onError: errorToast,
    onSuccess: (_, { kind }) => {
      toast.success(`${kind[0].toUpperCase()}${kind.slice(1)} started`, { description: "Progress shows in the top bar." });
      qc.invalidateQueries({ queryKey: keys.activeRuns });
      qc.invalidateQueries({ queryKey: keys.runs });
    },
  });
}

export function usePatchJob(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { stage?: string; feedback?: string; feedback_reason?: string; notes?: string; cv_id?: number }) =>
      api.patch<Job>(`/jobs/${id}`, body),
    onMutate: async (body) => {  // optimistic stage/feedback
      await qc.cancelQueries({ queryKey: keys.job(id) });
      const prev = qc.getQueryData<Job>(keys.job(id));
      if (prev) qc.setQueryData<Job>(keys.job(id), { ...prev, ...(body.stage ? { stage: body.stage as Job["stage"] } : {}),
        ...(body.feedback ? { feedback: body.feedback === "none" ? null : (body.feedback as Job["feedback"]) } : {}) });
      return { prev };
    },
    onError: (e, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.job(id), ctx.prev);
      errorToast(e);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.job(id) });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: keys.tracker });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}
