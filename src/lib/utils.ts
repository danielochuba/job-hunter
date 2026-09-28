import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNowStrict, format, isValid, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toDate(value?: string | null) {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export function timeAgo(value?: string | null) {
  const d = toDate(value);
  return d ? `${formatDistanceToNowStrict(d)} ago` : "—";
}

export function timeUntil(value?: string | null) {
  const d = toDate(value);
  if (!d) return "—";
  return d.getTime() < Date.now() ? `${formatDistanceToNowStrict(d)} overdue` : `in ${formatDistanceToNowStrict(d)}`;
}

export function formatDate(value?: string | null, pattern = "d MMM yyyy") {
  const d = toDate(value);
  return d ? format(d, pattern) : "—";
}

export function money(value?: number | null, digits = 2) {
  return `$${(value ?? 0).toFixed(digits)}`;
}

export function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export function initials(name?: string | null) {
  return (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
