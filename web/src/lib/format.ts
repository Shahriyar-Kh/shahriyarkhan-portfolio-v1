import { GITHUB_PROFILE_URL } from "@/content/site";

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export function formatMonthYear(isoDate: string): string {
  // Date-only ISO strings ("YYYY-MM-DD") parse as UTC midnight - append a
  // time to force local-timezone-safe parsing without a day shifting.
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return MONTH_YEAR.format(date);
}

export function formatDateRange(start: string, end: string | null, currentRole: boolean): string {
  const startLabel = formatMonthYear(start);
  // If the data disagrees (end_date set but current_role also true),
  // trust end_date - it's the more specific, more recently-edited fact.
  if (end) return `${startLabel} — ${formatMonthYear(end)}`;
  if (currentRole) return `${startLabel} — Present`;
  return startLabel;
}

export function hostnameOf(url: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

/**
 * Every project except Yango Wing Fleet links to the same generic GitHub
 * profile URL, not its own repository (a documented, real limitation -
 * see docs/rebuild/CONTENT_TRUTH_INVENTORY.md). This turns that into an
 * honest, visible design feature (a "GitHub profile" vs. "Source code"
 * label + verified-Node distinction) instead of papering over it.
 */
export function isDistinctRepoUrl(githubUrl: string): boolean {
  if (!githubUrl) return false;
  const normalize = (u: string) => u.replace(/\/+$/, "").toLowerCase();
  return normalize(githubUrl) !== normalize(GITHUB_PROFILE_URL);
}
