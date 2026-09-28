"use client";

import { Command } from "cmdk";
import {
  Briefcase, ChartColumn, Coins, FileText, History, LayoutDashboard, Link2, Moon, Play, Settings, SquareKanban, Sun, User, Wand2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/overlays";
import { useJobs, useStartRun } from "@/lib/api/hooks";

import { useImportJob } from "./import-job";

const CommandContext = React.createContext<() => void>(() => {});
export const useCommandPalette = () => React.useContext(CommandContext);

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/tracker", label: "Tracker", icon: SquareKanban },
  { href: "/insights", label: "Insights", icon: ChartColumn },
  { href: "/cvs", label: "CVs", icon: FileText },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/runs", label: "Runs", icon: History },
  { href: "/usage", label: "LLM usage", icon: Coins },
];

const item = "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const importJob = useImportJob();
  const startRun = useStartRun();
  const { data: jobs } = useJobs({ q: search || undefined, page_size: 8, sort: "fit" });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (fn: () => void) => { setOpen(false); setSearch(""); fn(); };

  return (
    <CommandContext.Provider value={() => setOpen(true)}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Command palette" className="max-w-xl gap-0 overflow-hidden p-0 [&>div:first-child]:sr-only">
          <Command shouldFilter={false} className="flex flex-col">
            <Command.Input value={search} onValueChange={setSearch} placeholder="Search jobs, pages, actions…"
              className="h-12 border-b bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground" />
            <Command.List className="max-h-96 overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Nothing found.</Command.Empty>
              {!!jobs?.items.length && (
                <Command.Group heading="Jobs" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  {jobs.items.map((j) => (
                    <Command.Item key={j.id} value={`job-${j.id}`} className={item} onSelect={() => go(() => router.push(`/jobs/${j.id}`))}>
                      <Briefcase />
                      <span className="truncate text-foreground">{j.title}</span>
                      <span className="truncate text-muted-foreground">· {j.company}</span>
                      {j.fit_score != null && <span className="ml-auto font-mono text-xs">{j.fit_score}</span>}
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group heading="Actions" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                <Command.Item value="import" className={item} onSelect={() => go(() => importJob())}><Link2 /> <span className="text-foreground">Import job from URL</span></Command.Item>
                <Command.Item value="collect" className={item} onSelect={() => go(() => startRun.mutate({ kind: "collect" }))}><Play /> <span className="text-foreground">Collect new jobs</span></Command.Item>
                <Command.Item value="match" className={item} onSelect={() => go(() => startRun.mutate({ kind: "match" }))}><Wand2 /> <span className="text-foreground">Match &amp; score jobs</span></Command.Item>
                <Command.Item value="theme" className={item} onSelect={() => go(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))}>
                  {resolvedTheme === "dark" ? <Sun /> : <Moon />} <span className="text-foreground">Toggle theme</span>
                </Command.Item>
              </Command.Group>
              <Command.Group heading="Go to" className="text-xs text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {NAV.filter((n) => !search || n.label.toLowerCase().includes(search.toLowerCase())).map((n) => (
                  <Command.Item key={n.href} value={`nav-${n.href}`} className={item} onSelect={() => go(() => router.push(n.href))}>
                    <n.icon /> <span className="text-foreground">{n.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </Dialog>
    </CommandContext.Provider>
  );
}

