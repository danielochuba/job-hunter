// Shapes returned by the FastAPI backend (see job-hunter-api/supabase/migrations).

export type Stage =
  | "new" | "filtered_out" | "ineligible" | "scored" | "generated" | "approved"
  | "rejected" | "applied" | "interviewing" | "offer" | "closed";

export interface Fit {
  fit_score: number;
  summary: string;
  matched_requirements: string[];
  gaps: string[];
  dealbreakers: string[];
  relevant_bullet_ids: string[];
  eligible: boolean;
  ineligible_reason: string;
  remote_policy: "remote" | "hybrid" | "onsite" | "unknown";
  visa_sponsorship: "yes" | "no" | "unknown";
  location_restrictions: string[];
  salary: string;
  required_skills: string[];
  missing_skills: string[];
  seniority: string;
  prechecked?: boolean;
}

export interface JobListItem {
  id: number;
  source: string;
  company: string;
  company_domain: string | null;
  title: string;
  location: string;
  url: string | null;
  posted_at: string | null;
  fetched_at: string;
  remote_policy: string | null;
  visa_sponsorship: string | null;
  salary: string | null;
  similarity: number | null;
  cv_id: number | null;
  fit_score: number | null;
  stage: Stage;
  feedback: "up" | "down" | null;
  fit_summary: string | null;
  ineligible_reason: string | null;
  updated_at: string;
}

export interface Job extends Omit<JobListItem, "fit_summary" | "ineligible_reason"> {
  key: string;
  description: string;
  fit: Fit | null;
  feedback_reason: string | null;
  notes: string | null;
  cv: { id: number; name: string } | null;
  counts: { applications: number; contacts: number; outreach: number; prep: number };
  next_reminder: { id: number; due_at: string; note: string } | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface TailoredBullet {
  source_id: string;
  text: string;
}

export interface TailoredResult {
  summary: string;
  skills_priority: string[];
  experience: { id: string; bullets: TailoredBullet[] }[];
  projects: { id: string; bullets: TailoredBullet[] }[];
  cover_letter: string;
}

export interface Application {
  id: number;
  job_id: number;
  cv_id: number | null;
  cv_name?: string | null;
  version: number;
  result: TailoredResult;
  warnings: string[];
  cover_letter: string;
  cv_html_path: string | null;
  cv_pdf_path: string | null;
  cover_letter_path: string | null;
  created_at: string;
}

export interface Contact {
  id: number;
  job_id: number;
  company_domain: string | null;
  name: string | null;
  role: string | null;
  email: string;
  source: "job_post" | "hunter" | "website" | "pattern" | "manual";
  confidence: number;
}

export interface Outreach {
  id: number;
  job_id: number;
  contact_id: number | null;
  contact_name?: string | null;
  contact_role?: string | null;
  to_email: string;
  subject: string;
  body: string;
  attach_cv: boolean;
  status: "draft" | "sent" | "replied" | "skipped";
  sent_at: string | null;
  replied_at: string | null;
  reply_snippet: string | null;
  created_at: string;
}

export interface TimelineEvent {
  id: number;
  job_id: number;
  kind: "stage_change" | "note" | "email_sent" | "reply" | "reminder_done" | "generated";
  note: string | null;
  at: string;
  title?: string;
  company?: string;
}

export interface Reminder {
  id: number;
  job_id: number | null;
  due_at: string;
  note: string;
  done: boolean;
  auto: boolean;
  title?: string | null;
  company?: string | null;
}

export interface PrepPack {
  id: number;
  job_id: number;
  created_at: string;
  content: {
    company_brief: string;
    why_you: string[];
    likely_questions: { question: string; type: string; answer_outline: string; bullet_ids: string[] }[];
    questions_to_ask: string[];
    red_flags: string[];
    study_topics: string[];
  };
}

export interface Run {
  id: number;
  kind: string;
  status: "queued" | "running" | "succeeded" | "failed";
  params: Record<string, unknown>;
  progress: { done: number; total: number; label?: string };
  result?: Record<string, unknown> | null;
  log?: string[];
  log_lines?: number;
  error: string | null;
  trigger: string;
  started_at: string;
  finished_at: string | null;
  cost_usd?: number;
}

export interface Bullet {
  id: string;
  text: string;
  skills: string[];
}

export interface MasterCV {
  summary: string;
  skills: Record<string, string[]>;
  experience: { id: string; company: string; title: string; location: string; start: string; end: string; bullets: Bullet[] }[];
  projects: { id: string; name: string; url: string; bullets: Bullet[] }[];
  education: { institution: string; degree: string; start: string; end: string }[];
  certifications: string[];
}

export interface CVSummary {
  id: number;
  name: string;
  is_default: boolean;
  source_file: string | null;
  created_at: string;
  updated_at: string;
  embedded: boolean;
  matched_jobs: number;
  roles: number;
}

export interface CVDetail extends Omit<CVSummary, "embedded" | "matched_jobs" | "roles"> {
  cv: MasterCV;
  raw_text: string | null;
  stats: { roles: number; bullets: number; projects: number; skills: number };
  source_url: string | null;
}

export interface ParsedContact {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  headline: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
}

export interface ParsedCV {
  contact: Partial<ParsedContact>;
  cv: MasterCV;
  raw_text: string;
  source_file: string;
  filename: string;
}

export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  preferred_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  email: string;
  phone: string | null;
  phone_country_code: string | null;
  city: string | null;
  state_region: string | null;
  country: string | null;
  timezone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  other_links: { label: string; url: string }[];
  years_experience: number | null;
  languages: { language: string; proficiency: string }[];
  target_roles: string[];
  seniority: string | null;
  employment_types: string[];
  needs_sponsorship: boolean;
  work_authorizations: string[];
  acceptable_regions: string[];
  remote_only: boolean;
  willing_to_relocate: boolean;
  min_salary: number | null;
  salary_currency: string | null;
  notice_period: string | null;
  email_signature: string | null;
  onboarded: boolean;
  completeness: number;
  missing: string[];
  missing_required: string[];
}

export interface Settings {
  filters: { title_include: string[]; title_exclude: string[]; locations: string[] };
  search_queries: string[];
  aggregators: string[];
  matching: { similarity_threshold: number; score_limit: number; min_fit_for_generate: number; alert_min_fit: number };
  schedule: { enabled: boolean; time: string; auto_match: boolean };
  followup_days: number;
  monthly_budget_usd: number;
  available_aggregators: string[];
  source_status: Record<string, { configured: boolean; needs: string; info: string; keyed: boolean }>;
  available_sources: string[];
  next_daily_run: string | null;
}

export interface Company {
  id: number;
  source: string;
  token: string;
  name: string | null;
  domain: string | null;
  active: boolean;
  jobs: number;
}

export interface Stats {
  stages: Partial<Record<Stage, number>>;
  kpis: {
    new_today: number; new_week: number; strong_matches: number; avg_fit: number | null;
    reminders_due: number; replies: number; emails_sent: number; unread: number;
  };
  daily: { day: string; jobs: number }[];
  by_source: { source: string; n: number }[];
  top: JobListItem[];
  activity: TimelineEvent[];
  reminders: Reminder[];
  replies: { id: number; job_id: number; to_email: string; replied_at: string; reply_snippet: string; title: string; company: string }[];
  funnel: { stage: Stage; n: number }[];
  spend_month: number;
  budget: number;
}

export interface Notification {
  id: number;
  kind: string;
  title: string;
  body: string;
  job_id: number | null;
  read: boolean;
  created_at: string;
}

export interface TrackerCard {
  id: number;
  title: string;
  company: string;
  company_domain: string | null;
  location: string;
  fit_score: number | null;
  stage: Stage;
  updated_at: string;
  next_due: string | null;
  last_activity: string | null;
  email_status: string | null;
}

export interface SkillGaps {
  min_fit: number;
  jobs_considered: number;
  missing: { skill: string; jobs: number; avg_fit: number; examples: { id: number; title: string; company: string; fit_score: number }[] }[];
  strengths: { skill: string; jobs: number }[];
}

export interface UsageReport {
  month: string;
  total: { cost: number; input_tokens: number; output_tokens: number; calls: number };
  by_purpose: { purpose: string; cost: number; calls: number; input_tokens: number; output_tokens: number }[];
  by_model: { model: string; cost: number; calls: number; input_tokens: number; output_tokens: number }[];
  by_day: { day: string; cost: number }[];
  budget: number;
}

export interface GmailStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}
