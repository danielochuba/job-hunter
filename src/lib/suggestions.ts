"use client";

import { useCV, useCVs } from "@/lib/api/hooks";

export const ROLE_SUGGESTIONS = [
  "Backend Engineer", "Software Engineer", "Senior Backend Engineer", "Full-Stack Engineer", "Python Developer",
  "Django Developer", "Node.js Developer", "API Engineer", "Platform Engineer", "DevOps Engineer",
  "Site Reliability Engineer", "Data Engineer", "Machine Learning Engineer", "AI Engineer", "Frontend Engineer",
  "Solutions Engineer", "Tech Lead", "Engineering Manager",
];

export const EMPLOYMENT_TYPES = ["Full-time", "Contract", "Part-time", "Freelance", "Internship"];

export const REGIONS = ["Worldwide", "EMEA", "Europe", "Africa", "UK", "EU", "North America", "LATAM", "APAC", "UTC±3"];

export const WORK_AUTH = ["Nigeria", "United Kingdom", "European Union", "United States", "Canada"];

/** Role suggestions: titles from your default CV first, then common roles. */
export function useRoleSuggestions() {
  const { data: cvs } = useCVs();
  const defaultId = cvs?.find((c) => c.is_default)?.id ?? cvs?.[0]?.id ?? 0;
  const { data: cv } = useCV(defaultId);
  const fromCv = (cv?.cv.experience ?? []).map((e) => e.title).filter(Boolean);
  return [...fromCv, ...ROLE_SUGGESTIONS];
}
