"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  Bell, Briefcase, ChartColumn, Coins, Crosshair, FileText, History, LayoutDashboard, LoaderCircle, LogOut, Monitor, Moon,
  PanelLeft, Search, Settings, SquareKanban, Sun, User,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  Popover, PopoverContent, PopoverTrigger, Progress, Tooltip,
} from "@/components/ui/overlays";
import { Kbd } from "@/components/ui/primitives";
import { api } from "@/lib/api/client";
import { keys, useActiveRuns, useMe, useNotifications, useStats } from "@/lib/api/hooks";
import { supabase } from "@/lib/supabase/client";
import { cn, initials, timeAgo, titleCase } from "@/lib/utils";

import { CommandPaletteProvider, useCommandPalette } from "./command-palette";
import { ImportJobProvider } from "./import-job";

const NAV_GROUPS = [
  { items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/jobs", label: "Jobs", icon: Briefcase, badge: "strong" as const },
    { href: "/tracker", label: "Tracker", icon: SquareKanban, badge: "due" as const },
    { href: "/insights", label: "Insights", icon: ChartColumn },
  ] },
  { label: "You", items: [
    { href: "/cvs", label: "CVs", icon: FileText },
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ] },
  { label: "System", items: [
    { href: "/runs", label: "Runs", icon: History },
    { href: "/usage", label: "LLM usage", icon: Coins },
  ] },
];

function Sidebar({ collapsed }: { collapsed: boolean }) {
  const path = usePathname();
  const { data: stats } = useStats();
  const badges = { strong: stats?.kpis.strong_matches, due: stats?.kpis.reminders_due };
  return (
    <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 md:flex", collapsed ? "w-16" : "w-60")}>
      <Link href="/" className="flex h-14 items-center gap-2 px-4 font-semibold tracking-tight">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
          <Crosshair className="size-4" />
        </span>
        {!collapsed && "JobHunter"}
      </Link>
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-2 scrollbar-thin">
        {NAV_GROUPS.map((g, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            {g.label && !collapsed && <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{g.label}</p>}
            {g.items.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              const count = "badge" in n && n.badge ? badges[n.badge] : undefined;
              const link = (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined}
                  className={cn("group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                    active ? "bg-card font-medium text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-0")}>
                  <n.icon className={cn("size-4 shrink-0", active && "text-primary")} />
                  {!collapsed && <span className="flex-1">{n.label}</span>}
                  {!collapsed && !!count && (
                    <span className="rounded-full bg-primary/12 px-1.5 font-mono text-[10px] font-semibold text-primary tabular">{count}</span>
                  )}
                </Link>
              );
              return collapsed ? <Tooltip key={n.href} content={n.label} side="right">{link}</Tooltip> : link;
            })}
          </div>
        ))}
      </nav>
      {!collapsed && stats && stats.budget > 0 && (
        <div className="m-3 rounded-lg border bg-card p-3 text-xs">
          <div className="mb-2 flex justify-between text-muted-foreground">
            <span>LLM spend this month</span>
            <span className="font-mono text-foreground tabular">${stats.spend_month.toFixed(2)}</span>
          </div>
          <Progress value={(100 * stats.spend_month) / stats.budget}
            indicatorClassName={stats.spend_month / stats.budget > 0.8 ? "bg-warning" : undefined} />
          <p className="mt-1.5 text-muted-foreground">of ${stats.budget.toFixed(0)} budget</p>
        </div>
      )}
    </aside>
  );
}

function RunPill() {
  const { data: active } = useActiveRuns();
  const run = active?.[0];
  if (!run) return null;
  const { done, total, label } = run.progress || { done: 0, total: 0 };
  return (
    <Link href="/runs" className="hidden items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-2 text-xs shadow-xs sm:flex">
      <LoaderCircle className="size-3.5 animate-spin text-primary" />
      <span className="font-medium">{titleCase(run.kind)}</span>
      <span className="max-w-48 truncate text-muted-foreground">{label || "running"}{total ? ` · ${done}/${total}` : ""}</span>
      {active.length > 1 && <span className="text-muted-foreground">+{active.length - 1}</span>}
    </Link>
  );
}

function NotificationBell() {
  const qc = useQueryClient();
  const router = useRouter();
  const { data } = useNotifications();
  const unread = data?.unread ?? 0;
  const seen = React.useRef<number | null>(null);

  // Browser notifications for anything new since the last poll (the API also raises an OS toast).
  React.useEffect(() => {
    const newest = data?.items[0];
    if (!newest) return;
    if (seen.current !== null && newest.id > seen.current && !newest.read && typeof Notification !== "undefined"
        && Notification.permission === "granted" && document.hidden) {
      new Notification(newest.title, { body: newest.body });
    }
    seen.current = Math.max(seen.current ?? 0, newest.id);
  }, [data]);

  const markAll = async () => {
    await api.post("/notifications/read", {});
    qc.invalidateQueries({ queryKey: keys.notifications });
  };

  return (
    <Popover onOpenChange={(o) => { if (o && typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && <button className="cursor-pointer text-xs text-primary hover:underline" onClick={markAll}>Mark all read</button>}
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {!data?.items.length && <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>}
          {data?.items.map((n) => (
            <button key={n.id} onClick={() => n.job_id && router.push(`/jobs/${n.job_id}`)}
              className={cn("flex w-full cursor-pointer gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted", !n.read && "bg-accent/40")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{n.title}</span>
                {n.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UserMenu() {
  const { data: me } = useMe();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const signOut = async () => {
    await supabase().auth.signOut();
    router.replace("/login");
    router.refresh();
  };
  const name = me?.preferred_name || me?.full_name || me?.email;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer rounded-full" aria-label="Account menu">
          <Avatar src={me?.avatar_url} fallback={initials(me?.full_name || me?.email)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-medium text-foreground">{name}</span>
          <span className="block truncate">{me?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/profile")}><User /> Profile</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}><Settings /> Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([t, Icon]) => (
          <DropdownMenuItem key={t} onSelect={(e) => { e.preventDefault(); setTheme(t); }} className={cn(theme === t && "bg-muted")}>
            <Icon /> {titleCase(t)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}><LogOut /> Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Topbar({ onToggle }: { onToggle: () => void }) {
  const openPalette = useCommandPalette();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Toggle sidebar" className="hidden md:inline-flex"><PanelLeft /></Button>
      <button onClick={openPalette}
        className="flex h-9 w-full max-w-md cursor-pointer items-center gap-2 rounded-lg border bg-card px-3 text-sm text-muted-foreground shadow-xs hover:bg-muted">
        <Search className="size-4" />
        <span className="flex-1 text-left">Search jobs or jump to…</span>
        <Kbd>Ctrl K</Kbd>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <RunPill />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}

function MobileNav() {
  const path = usePathname();
  const items = NAV_GROUPS.flatMap((g) => g.items).slice(0, 5);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 backdrop-blur md:hidden">
      {items.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
            <n.icon className="size-5" /> {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { data: me } = useMe();
  const router = useRouter();
  const path = usePathname();
  React.useEffect(() => {
    if (me && !me.onboarded && path !== "/onboarding") router.replace("/onboarding");
  }, [me, path, router]);
  return <>{children}</>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    try { setCollapsed(localStorage.getItem("jh:sidebar") === "collapsed"); } catch {}
  }, []);
  const toggle = () => setCollapsed((c) => {
    try { localStorage.setItem("jh:sidebar", c ? "open" : "collapsed"); } catch {}
    return !c;
  });
  return (
    <ImportJobProvider>
      <CommandPaletteProvider>
        <OnboardingGate>
          <div className="flex min-h-screen">
            <Sidebar collapsed={collapsed} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar onToggle={toggle} />
              <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">{children}</main>
            </div>
          </div>
          <MobileNav />
        </OnboardingGate>
      </CommandPaletteProvider>
    </ImportJobProvider>
  );
}
