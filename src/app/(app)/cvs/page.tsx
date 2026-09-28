"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Copy, FileText, FileUp, MoreHorizontal, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState, PageHeader } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Confirm, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import { Badge, Card, CardContent, Skeleton } from "@/components/ui/primitives";
import { ReviewParsed, UploadZone } from "@/features/cv/upload";
import { api } from "@/lib/api/client";
import { keys, useCVs } from "@/lib/api/hooks";
import type { ParsedCV } from "@/lib/api/types";
import { cn, timeAgo } from "@/lib/utils";

export default function CvsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: cvs, isLoading } = useCVs();
  const [parsed, setParsed] = React.useState<ParsedCV | null>(null);
  const [showUpload, setShowUpload] = React.useState(false);
  const [deleting, setDeleting] = React.useState<number | null>(null);
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); toast.success(msg); qc.invalidateQueries({ queryKey: keys.cvs }); } catch (e) { toast.error((e as Error).message); }
  };

  if (parsed) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Review your CV" description={`Parsed from ${parsed.filename}`} />
        <ReviewParsed parsed={parsed} onCancel={() => setParsed(null)} onDone={(cv) => { setParsed(null); router.push(`/cvs/${cv.id}`); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="CVs" description="Keep several master CVs (e.g. Backend, Full-stack). Each job is matched against the one that fits best."
        actions={cvs?.length ? <Button onClick={() => setShowUpload((s) => !s)}><FileUp /> Upload CV</Button> : undefined} />
      {(showUpload || (!isLoading && !cvs?.length)) && <UploadZone onParsed={setParsed} />}
      {isLoading && <Skeleton className="h-40 rounded-xl" />}
      {!isLoading && !cvs?.length && !showUpload && <EmptyState icon={FileText} title="No CV yet" description="Upload one to start matching." />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cvs?.map((c) => (
          <Card key={c.id} className={cn("group relative transition-shadow hover:shadow-md", c.is_default && "ring-2 ring-primary/40")}>
            <Link href={`/cvs/${c.id}`} className="absolute inset-0 z-0" aria-label={`Open ${c.name}`} />
            <CardContent className="flex flex-col gap-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground"><FileText className="size-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">Updated {timeAgo(c.updated_at)}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" className="relative z-10" aria-label="CV actions"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {!c.is_default && <DropdownMenuItem onSelect={() => act(() => api.post(`/cvs/${c.id}/default`), `${c.name} is now the default`)}><Star /> Make default</DropdownMenuItem>}
                    <DropdownMenuItem onSelect={() => act(() => api.post(`/cvs/${c.id}/duplicate`), "Duplicated")}><Copy /> Duplicate</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDeleting(c.id)} className="text-destructive"><Trash2 /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.is_default && <Badge><Star /> Default</Badge>}
                <Badge variant="muted">{c.roles} roles</Badge>
                <Badge variant="muted">{c.matched_jobs} jobs matched</Badge>
                {!c.embedded && <Badge variant="warning">Embeds on next match</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Confirm open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} destructive confirmLabel="Delete"
        title="Delete this CV?" description="Jobs matched to it will fall back to your default CV. Generated documents are kept."
        onConfirm={() => deleting && act(() => api.del(`/cvs/${deleting}`), "CV deleted")} />
    </div>
  );
}
