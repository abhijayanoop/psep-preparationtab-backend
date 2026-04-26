import { ReadinessLabel } from "@/interfaces/preparation.interface";

export const deriveReadinessLabel = (marketIndex: number): ReadinessLabel => {
  if (marketIndex >= 80) return "Advanced";
  if (marketIndex >= 55) return "Ready";
  if (marketIndex >= 30) return "Emerging";
  return "Developing";
};

export const composeAcademicBackground = (fields: {
  degree?: string;
  course?: string;
  specialization?: string;
  branch?: string;
  major?: string;
}): string => {
  const parts = [
    fields.degree,
    fields.branch || fields.course,
    fields.specialization || fields.major,
  ]
    .filter(Boolean)
    .map((s) => s!.trim())
    .filter((s) => s.length > 0);

  return parts.join(" ") || "Not specified";
};
