"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink, Save, Star } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Badge, Input, Skeleton } from "@/components/ui/primitives";
import { CvEditor } from "@/features/cv/cv-editor";
import { api } from "@/lib/api/client";
import { keys, useCV } from "@/lib/api/hooks";
import type { CVDetail, MasterCV } from "@/lib/api/types";

function Editor({ detail }: { detail: CVDetail }) {
  const qc = useQueryClient();
  const [cv, setCv] = React.useState<MasterCV>(detail.cv);
  const [name, setName] = React.useState(detail.name);
  const [saving, setSaving] = React.useState(false);
  const dirty = name !== detail.name || JSON.stringify(cv) !== JSON.stringify(detail.cv);

  React.useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/cvs/${detail.id}`, { name, cv });
      toast.success("CV saved", { description: "Matching will re-embed it on the next run." });
      qc.invalidateQueries({ queryKey: keys.cv(detail.id) });
      qc.invalidateQueries({ queryKey: keys.cvs });
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/cvs" className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ChevronLeft className="size-3" /> CVs</Link>
      <PageHeader
        title={<Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 max-w-md text-lg font-semibold" aria-label="CV name" />}
        description={<span className="flex flex-wrap items-center gap-2">
          {detail.is_default && <Badge><Star /> Default</Badge>}
          {detail.stats.roles} roles · {detail.stats.bullets} bullets · {detail.stats.projects} projects · {detail.stats.skills} skills
          {detail.source_url && <a href={detail.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">original file <ExternalLink className="size-3" /></a>}
        </span>}
        actions={<Button onClick={save} disabled={!dirty} loading={saving}><Save /> Save changes</Button>} />
      <CvEditor value={cv} onChange={setCv} />
      {dirty && (
        <div className="sticky bottom-20 z-20 mx-auto flex items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg md:bottom-6 animate-in">
          <span className="text-sm">Unsaved changes</span>
          <Button size="sm" variant="ghost" onClick={() => { setCv(detail.cv); setName(detail.name); }}>Discard</Button>
          <Button size="sm" onClick={save} loading={saving}>Save</Button>
        </div>
      )}
    </div>
  );
}

export default function CvPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useCV(Number(id));
  if (isLoading || !data) return <Skeleton className="h-96 rounded-xl" />;
  return <Editor key={data.updated_at} detail={data} />;
}
