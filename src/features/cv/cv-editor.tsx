"use client";

import { Braces, GripVertical, Plus, Trash2 } from "lucide-react";
import * as React from "react";

import { ChipInput } from "@/components/app/bits";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { Card, CardContent, CardHeader, CardTitle, Field, Input, Textarea } from "@/components/ui/primitives";
import type { Bullet, MasterCV } from "@/lib/api/types";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "item";

function uniqueId(base: string, taken: Set<string>) {
  let id = base, n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  return id;
}

function allBulletIds(cv: MasterCV) {
  return new Set([...cv.experience, ...cv.projects].flatMap((x) => x.bullets.map((b) => b.id)));
}

function BulletList({ parentId, bullets, cv, onChange }: { parentId: string; bullets: Bullet[]; cv: MasterCV; onChange: (b: Bullet[]) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {bullets.map((b, i) => (
        <div key={b.id} className="group flex items-start gap-2">
          <GripVertical className="mt-2.5 size-4 shrink-0 text-muted-foreground/40" />
          <div className="flex-1">
            <Textarea rows={2} className="min-h-0" value={b.text} onChange={(e) => onChange(bullets.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{b.id}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label="Delete bullet" className="opacity-40 group-hover:opacity-100"
            onClick={() => onChange(bullets.filter((_, j) => j !== i))}><Trash2 /></Button>
        </div>
      ))}
      <Button variant="ghost" size="sm" className="self-start"
        onClick={() => onChange([...bullets, { id: uniqueId(`${parentId}-${bullets.length + 1}`, allBulletIds(cv)), text: "", skills: [] }])}>
        <Plus /> Add bullet
      </Button>
    </div>
  );
}

/** Structured editor for a master CV, with a raw JSON escape hatch. */
export function CvEditor({ value, onChange }: { value: MasterCV; onChange: (cv: MasterCV) => void }) {
  const cv = value;
  const set = <K extends keyof MasterCV>(k: K, v: MasterCV[K]) => onChange({ ...cv, [k]: v });
  const [json, setJson] = React.useState(() => JSON.stringify(cv, null, 2));
  const [jsonError, setJsonError] = React.useState<string | null>(null);
  const skillGroups = Object.entries(cv.skills || {});

  return (
    <Tabs defaultValue="form" onValueChange={(t) => t === "json" && setJson(JSON.stringify(cv, null, 2))}>
      <TabsList>
        <TabsTrigger value="form">Editor</TabsTrigger>
        <TabsTrigger value="json"><Braces /> JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="form" className="flex flex-col gap-4">
        <Card>
          <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
          <CardContent><Textarea rows={3} value={cv.summary} onChange={(e) => set("summary", e.target.value)} /></CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Skills</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => set("skills", { ...cv.skills, [`Group ${skillGroups.length + 1}`]: [] })}><Plus /> Group</Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {skillGroups.map(([group, items], gi) => (
              <div key={gi} className="grid gap-2 sm:grid-cols-[10rem_1fr_auto] sm:items-start">
                <Input value={group} onChange={(e) => {
                  const entries = skillGroups.map(([g, it], j) => (j === gi ? [e.target.value, it] : [g, it]));
                  set("skills", Object.fromEntries(entries));
                }} />
                <ChipInput value={items} onChange={(v) => set("skills", { ...cv.skills, [group]: v })} placeholder="Type a skill, press Enter" />
                <Button variant="ghost" size="icon-sm" aria-label="Remove group"
                  onClick={() => set("skills", Object.fromEntries(skillGroups.filter((_, j) => j !== gi)))}><Trash2 /></Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Experience</h3>
          <Button variant="outline" size="sm" onClick={() => set("experience", [...cv.experience, {
            id: uniqueId("role", new Set(cv.experience.map((e) => e.id))), company: "", title: "", location: "", start: "", end: "present", bullets: [],
          }])}><Plus /> Role</Button>
        </div>
        {cv.experience.map((e, i) => {
          const upd = (patch: Partial<typeof e>) => set("experience", cv.experience.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_6rem_6rem_auto]">
                  <Field label="Title"><Input value={e.title} onChange={(ev) => upd({ title: ev.target.value })} /></Field>
                  <Field label="Company"><Input value={e.company} onChange={(ev) => upd({ company: ev.target.value, ...(e.id.startsWith("role") ? { id: uniqueId(slug(ev.target.value), new Set(cv.experience.filter((_, j) => j !== i).map((x) => x.id))) } : {}) })} /></Field>
                  <Field label="Location"><Input value={e.location} onChange={(ev) => upd({ location: ev.target.value })} /></Field>
                  <Field label="Start"><Input value={e.start} placeholder="2023-06" onChange={(ev) => upd({ start: ev.target.value })} /></Field>
                  <Field label="End"><Input value={e.end} placeholder="present" onChange={(ev) => upd({ end: ev.target.value })} /></Field>
                  <Button variant="ghost" size="icon-sm" className="self-end" aria-label="Delete role"
                    onClick={() => set("experience", cv.experience.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
                <BulletList parentId={e.id} bullets={e.bullets} cv={cv} onChange={(b) => upd({ bullets: b })} />
              </CardContent>
            </Card>
          );
        })}

        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Projects</h3>
          <Button variant="outline" size="sm" onClick={() => set("projects", [...cv.projects, {
            id: uniqueId("project", new Set(cv.projects.map((p) => p.id))), name: "", url: "", bullets: [],
          }])}><Plus /> Project</Button>
        </div>
        {cv.projects.map((p, i) => {
          const upd = (patch: Partial<typeof p>) => set("projects", cv.projects.map((x, j) => (j === i ? { ...x, ...patch } : x)));
          return (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3 pt-5">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Field label="Name"><Input value={p.name} onChange={(ev) => upd({ name: ev.target.value })} /></Field>
                  <Field label="URL"><Input value={p.url} onChange={(ev) => upd({ url: ev.target.value })} /></Field>
                  <Button variant="ghost" size="icon-sm" className="self-end" aria-label="Delete project"
                    onClick={() => set("projects", cv.projects.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
                <BulletList parentId={p.id} bullets={p.bullets} cv={cv} onChange={(b) => upd({ bullets: b })} />
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Education</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => set("education", [...cv.education, { institution: "", degree: "", start: "", end: "" }])}><Plus /> Add</Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {cv.education.map((ed, i) => {
              const upd = (patch: Partial<typeof ed>) => set("education", cv.education.map((x, j) => (j === i ? { ...x, ...patch } : x)));
              return (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem_auto]">
                  <Input placeholder="Degree" value={ed.degree} onChange={(e) => upd({ degree: e.target.value })} />
                  <Input placeholder="Institution" value={ed.institution} onChange={(e) => upd({ institution: e.target.value })} />
                  <Input placeholder="Start" value={ed.start} onChange={(e) => upd({ start: e.target.value })} />
                  <Input placeholder="End" value={ed.end} onChange={(e) => upd({ end: e.target.value })} />
                  <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => set("education", cv.education.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
          <CardContent><ChipInput value={cv.certifications || []} onChange={(v) => set("certifications", v)} placeholder="e.g. AWS Solutions Architect" /></CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="json">
        <Textarea rows={28} spellCheck={false} className="font-mono text-xs" value={json}
          onChange={(e) => {
            setJson(e.target.value);
            try { onChange(JSON.parse(e.target.value)); setJsonError(null); } catch (err) { setJsonError((err as Error).message); }
          }} />
        {jsonError && <p className="mt-1 text-xs text-destructive">{jsonError}</p>}
      </TabsContent>
    </Tabs>
  );
}
