"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Camera, CloudUpload, LoaderCircle } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/bits";
import { Avatar, Progress } from "@/components/ui/overlays";
import { Card, CardContent, Skeleton } from "@/components/ui/primitives";
import {
  ContactSection, EligibilitySection, LinksSection, PersonalSection, PreferencesSection, SalarySection,
} from "@/features/profile/sections";
import { SaveIndicator } from "@/features/profile/save-indicator";
import { useAutosave } from "@/features/profile/use-autosave";
import { api } from "@/lib/api/client";
import { keys, useMe } from "@/lib/api/hooks";
import type { UserProfile } from "@/lib/api/types";
import { cn, initials, titleCase } from "@/lib/utils";

function Header({ me }: { me: UserProfile }) {
  const qc = useQueryClient();
  const input = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const upload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { await api.upload("/me/avatar", file); qc.invalidateQueries({ queryKey: keys.me }); toast.success("Photo updated"); }
    catch (e) { toast.error((e as Error).message); } finally { setUploading(false); }
  };
  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-[linear-gradient(120deg,color-mix(in_oklch,var(--primary)_35%,transparent),color-mix(in_oklch,var(--chart-2)_30%,transparent))]" />
      <CardContent className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end">
        <button onClick={() => input.current?.click()} className="group relative w-fit cursor-pointer rounded-full ring-4 ring-card" aria-label="Change photo">
          <Avatar src={me.avatar_url} fallback={initials(me.full_name || me.email)} className="size-20 text-lg" />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5" />}
          </span>
        </button>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{me.full_name || "Your name"}</p>
          <p className="text-sm text-muted-foreground">{me.headline || me.email}</p>
        </div>
        <div className="w-full sm:w-64">
          <div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">Profile completeness</span><span className="font-mono font-medium">{me.completeness}%</span></div>
          <Progress value={me.completeness} indicatorClassName={cn(me.completeness === 100 && "bg-success")} />
          {me.missing.length > 0 && <p className="mt-1.5 text-[11px] text-muted-foreground">Add {me.missing.slice(0, 3).map(titleCase).join(", ")}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: me, isLoading } = useMe();
  const { draft, update, state } = useAutosave<UserProfile>(me, "/me");

  if (isLoading || !draft || !me) return <div className="flex flex-col gap-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>;
  const p = { ...draft, completeness: me.completeness, missing: me.missing, avatar_url: me.avatar_url, full_name: me.full_name };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="The single source of truth for your contact details and job preferences." actions={<SaveIndicator state={state} />} />
      {me.missing_required.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
          <CloudUpload className="size-4 text-warning" /> Needed before generating CVs: {me.missing_required.map(titleCase).join(", ")}
        </div>
      )}
      <Header me={me} />
      <PersonalSection p={p} update={update} />
      <ContactSection p={p} update={update} />
      <LinksSection p={p} update={update} />
      <PreferencesSection p={p} update={update} />
      <EligibilitySection p={p} update={update} />
      <SalarySection p={p} update={update} />
    </div>
  );
}
