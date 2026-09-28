# job-hunter

This is the web dashboard for JobHunter, a personal job-search app. From here you can:
- review ranked jobs;
- edit tailored CVs and cover letters;
- find contacts and send outreach;
- track applications on a board;
- see skill gaps and LLM spend.

The backend lives in [`job-hunter-api`](https://github.com/danielochuba/job-hunter-api). The UI never touches the database directly. Supabase is used only to sign in, and every request goes to the FastAPI backend with the Supabase JWT as a Bearer token.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- Radix primitives styled in the shadcn idiom (`src/components/ui`), lucide icons, Geist fonts, light and dark themes
- TanStack Query for data fetching and run polling, Recharts, dnd-kit for the tracker board, cmdk for the command palette, sonner for toasts

## Setup

Use **pnpm**.

```bash
pnpm install
cp .env.example .env.local      # fill in NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY and NEXT_PUBLIC_API_URL
pnpm dev                        # http://localhost:3000
```

Start the API on port 8000 first (see its README). Sign in with the Supabase user whose email matches the API's `ALLOWED_USER_EMAIL`. A short onboarding flow then walks you through your profile, CV upload, preferences, sources and Gmail.

```bash
pnpm lint
pnpm build && pnpm start
```

## Layout

```
src/
  proxy.ts              Next 16 "proxy" (formerly middleware): refreshes the session, redirects to /login
  app/
    login/, onboarding/ outside the app shell
    (app)/              dashboard, jobs, jobs/[id], tracker, insights, cvs, cvs/[id], profile, settings, runs, usage
  components/ui/        primitives (button, card, inputs, dialogs, menus, tabs, select, switch…)
  components/app/       shell (sidebar/topbar), command palette, import-job dialog, run watcher, score ring, chips…
  features/             page-specific building blocks: job/ (documents, contacts, prep, timeline), cv/, profile/
  lib/api/              typed fetch client, response types, React Query hooks
  lib/supabase/         browser client (auth only)
```

## Keyboard
- `Ctrl/⌘ K`: open the command palette to jump to a job, collect, match, import a URL, or toggle the theme.
- On the jobs list:
  - `j` and `k` move up and down.
  - `Enter` opens the job.
  - `a` approves it and `r` rejects it.
  - `g` generates documents.
  - `x` selects it.
