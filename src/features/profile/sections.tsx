"use client";

import { Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { ChipInput } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Select, Switch } from "@/components/ui/overlays";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Field, Input, Textarea } from "@/components/ui/primitives";
import type { UserProfile } from "@/lib/api/types";
import { EMPLOYMENT_TYPES, REGIONS, WORK_AUTH, useRoleSuggestions } from "@/lib/suggestions";

export type Update = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
type Props = { p: UserProfile; update: Update };

const text = (p: UserProfile, update: Update, key: keyof UserProfile, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
  <Input value={(p[key] as string | null) ?? ""} onChange={(e) => update(key, e.target.value as never)} {...props} />
);

export function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function PersonalSection({ p, update }: Props) {
  return (
    <Section title="Personal" description="Used on your CVs and in email sign-offs.">
      <Field label="First name *">{text(p, update, "first_name", { autoComplete: "given-name" })}</Field>
      <Field label="Last name *">{text(p, update, "last_name", { autoComplete: "family-name" })}</Field>
      <Field label="Preferred name" hint="How the app greets you">{text(p, update, "preferred_name")}</Field>
      <Field label="Pronouns">{text(p, update, "pronouns", { placeholder: "optional" })}</Field>
      <Field label="Headline" className="sm:col-span-2" hint="Shown under your name on generated CVs">
        {text(p, update, "headline", { placeholder: "Backend Engineer · Python/Django & Node" })}
      </Field>
      <Field label="Short bio" className="sm:col-span-2">
        <Textarea rows={3} value={p.bio ?? ""} onChange={(e) => update("bio", e.target.value)} />
      </Field>
    </Section>
  );
}

export function ContactSection({ p, update }: Props) {
  return (
    <Section title="Contact & location">
      <Field label="Email *">{text(p, update, "email", { type: "email", autoComplete: "email" })}</Field>
      <div className="grid grid-cols-[6rem_1fr] gap-2">
        <Field label="Code">{text(p, update, "phone_country_code", { placeholder: "+234" })}</Field>
        <Field label="Phone">{text(p, update, "phone", { autoComplete: "tel-national" })}</Field>
      </div>
      <Field label="City *">{text(p, update, "city", { autoComplete: "address-level2" })}</Field>
      <Field label="State / region">{text(p, update, "state_region")}</Field>
      <Field label="Country *">{text(p, update, "country", { autoComplete: "country-name" })}</Field>
      <Field label="Timezone">{text(p, update, "timezone", { placeholder: Intl.DateTimeFormat().resolvedOptions().timeZone })}</Field>
    </Section>
  );
}

export function LinksSection({ p, update }: Props) {
  const links = p.other_links ?? [];
  const langs = p.languages ?? [];
  return (
    <Section title="Links & languages">
      <Field label="LinkedIn">{text(p, update, "linkedin_url", { type: "url", placeholder: "https://linkedin.com/in/…" })}</Field>
      <Field label="GitHub">{text(p, update, "github_url", { type: "url", placeholder: "https://github.com/…" })}</Field>
      <Field label="Portfolio / website">{text(p, update, "portfolio_url", { type: "url" })}</Field>
      <Field label="Years of experience">
        <Input type="number" min={0} step={0.5} value={p.years_experience ?? ""} onChange={(e) => update("years_experience", e.target.value === "" ? null : Number(e.target.value))} />
      </Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <p className="text-xs font-medium text-muted-foreground">Other links</p>
        {links.map((l, i) => (
          <div key={i} className="grid grid-cols-[10rem_1fr_auto] gap-2">
            <Input placeholder="Label" value={l.label} onChange={(e) => update("other_links", links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <Input placeholder="https://" value={l.url} onChange={(e) => update("other_links", links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <Button variant="ghost" size="icon-sm" aria-label="Remove link" onClick={() => update("other_links", links.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="self-start" onClick={() => update("other_links", [...links, { label: "", url: "" }])}><Plus /> Add link</Button>
      </div>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <p className="text-xs font-medium text-muted-foreground">Languages</p>
        {langs.map((l, i) => (
          <div key={i} className="grid grid-cols-[1fr_12rem_auto] gap-2">
            <Input placeholder="Language" value={l.language} onChange={(e) => update("languages", langs.map((x, j) => (j === i ? { ...x, language: e.target.value } : x)))} />
            <Select value={l.proficiency || undefined} placeholder="Proficiency"
              onValueChange={(v) => update("languages", langs.map((x, j) => (j === i ? { ...x, proficiency: v } : x)))}
              options={["Native", "Fluent", "Professional", "Conversational", "Basic"].map((v) => ({ value: v, label: v }))} />
            <Button variant="ghost" size="icon-sm" aria-label="Remove language" onClick={() => update("languages", langs.filter((_, j) => j !== i))}><Trash2 /></Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="self-start" onClick={() => update("languages", [...langs, { language: "", proficiency: "" }])}><Plus /> Add language</Button>
      </div>
    </Section>
  );
}

export function PreferencesSection({ p, update }: Props) {
  const roles = useRoleSuggestions();
  return (
    <Section title="What you're looking for" description="Used as search queries and to judge seniority fit.">
      <Field label="Target roles" className="sm:col-span-2" hint="Pick as many as you like. Also used as search terms when Settings has none">
        <ChipInput value={p.target_roles} onChange={(v) => update("target_roles", v)} suggestions={roles}
          placeholder="Type a role and press Enter, or pick below" />
      </Field>
      <Field label="Seniority">
        <Select value={p.seniority ?? undefined} placeholder="Any" onValueChange={(v) => update("seniority", v)}
          options={["Junior", "Mid", "Senior", "Staff", "Principal"].map((v) => ({ value: v.toLowerCase(), label: v }))} />
      </Field>
      <Field label="Employment types">
        <ChipInput value={p.employment_types} onChange={(v) => update("employment_types", v)} suggestions={EMPLOYMENT_TYPES} placeholder="Full-time, Contract…" />
      </Field>
      <Field label="Notice period">{text(p, update, "notice_period", { placeholder: "e.g. 1 month" })}</Field>
    </Section>
  );
}

export function EligibilitySection({ p, update }: Props) {
  return (
    <Section title="Eligibility" description="Jobs you can't take are filtered out before scoring, saving time and tokens.">
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
        <span><span className="block text-sm font-medium">I need visa sponsorship</span><span className="text-xs text-muted-foreground">Postings that say they don&apos;t sponsor are marked ineligible</span></span>
        <Switch checked={p.needs_sponsorship} onCheckedChange={(v) => update("needs_sponsorship", v)} />
      </label>
      <Field label="Already authorised to work in" hint="Countries or regions, e.g. Nigeria, EU">
        <ChipInput value={p.work_authorizations} onChange={(v) => update("work_authorizations", v)} suggestions={WORK_AUTH} maxSuggestions={6} />
      </Field>
      <Field label="Acceptable regions for remote work" hint="e.g. EMEA, Worldwide, UTC±3">
        <ChipInput value={p.acceptable_regions} onChange={(v) => update("acceptable_regions", v)} suggestions={REGIONS} maxSuggestions={8} />
      </Field>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span className="text-sm font-medium">Remote only</span>
        <Switch checked={p.remote_only} onCheckedChange={(v) => update("remote_only", v)} />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span className="text-sm font-medium">Willing to relocate</span>
        <Switch checked={p.willing_to_relocate} onCheckedChange={(v) => update("willing_to_relocate", v)} />
      </label>
    </Section>
  );
}

export function SalarySection({ p, update }: Props) {
  return (
    <Section title="Salary & sign-off">
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Field label="Minimum salary (yearly)">
          <Input type="number" min={0} value={p.min_salary ?? ""} onChange={(e) => update("min_salary", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label="Currency">{text(p, update, "salary_currency", { placeholder: "USD" })}</Field>
      </div>
      <div />
      <Field label="Email signature" className="sm:col-span-2" hint="Appended to outreach emails">
        <Textarea rows={4} value={p.email_signature ?? ""} onChange={(e) => update("email_signature", e.target.value)}
          placeholder={`${p.full_name || "Your Name"}\n${p.headline || "Backend Engineer"}\n${p.linkedin_url || "linkedin.com/in/you"}`} />
      </Field>
    </Section>
  );
}
