import { StrokeIcon, type StrokeIconProps } from "@/components/icons/stroke-icon";

type IconProps = Omit<StrokeIconProps, "viewBox" | "children">;

/**
 * FINAL-DESIGN-01A-R4 §E: the Skills section's hybrid icon system, per
 * the owner's explicit scope decision - one consistent mark per real
 * skill *category* (5, matching the 5 real categories the backend
 * returns: Frontend/Backend/Database/Tools/Deployment), plus individual
 * marks only for the verified Core Stack skills. Every mark is an
 * original, abstract, geometric interpretation in the same stroke
 * language as the SK mark and every other icon in this directory - never
 * an attempt to reproduce a real trademarked product logo (no snake, no
 * elephant, no whale, no atom), and never fetched from a remote icon
 * CDN. Skill/category names always render as real text alongside these -
 * see skills-capability.tsx - so a name is never lost if an icon fails.
 */
export const CategoryIcon = {
  Frontend: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="4" width="18" height="16" />
      <path d="M3 9 H21" />
      <circle cx="6.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="9" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),

  Backend: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="4" width="18" height="6" />
      <rect x="3" y="14" width="18" height="6" />
      <circle cx="7" cy="7" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="0.7" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),

  Database: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <path d="M4 6 Q12 2 20 6 V18 Q12 22 4 18 Z" />
      <path d="M4 6 Q12 10 20 6 M4 12 Q12 16 20 12" />
    </StrokeIcon>
  ),

  Tools: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M5.6 18.4 L7.7 16.3 M16.3 7.7 L18.4 5.6" />
    </StrokeIcon>
  ),

  Deployment: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="4" y="14" width="9" height="7" />
      <path d="M13 14 L20 7 M15 7 H20 V12" />
      <circle cx="20" cy="7" r="1.4" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),
} as const;

export const CoreStackIcon = {
  Python: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="4" y="4" width="9" height="9" />
      <rect x="11" y="11" width="9" height="9" />
      <circle cx="7.5" cy="7.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16.5" r="0.7" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),

  Django: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <path d="M8 4 H14 V16 A4 4 0 0 1 6 16 V14 A2 2 0 0 0 10 14 V4" />
      <path d="M8 4 H14" />
    </StrokeIcon>
  ),

  PostgreSQL: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <path d="M4 6 Q12 2 20 6 V18 Q12 22 4 18 Z" />
      <circle cx="12" cy="12" r="3.4" />
    </StrokeIcon>
  ),

  React: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <rect x="10.5" y="10.5" width="3" height="3" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),

  Docker: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="3" y="14" width="6" height="6" />
      <rect x="9" y="14" width="6" height="6" />
      <rect x="9" y="8" width="6" height="6" />
      <path d="M15 17 H21" />
    </StrokeIcon>
  ),
} as const;

/** Keyword-matched against the category's real name (Frontend/Backend/
 * Database/Tools/Deployment today) - falls back to Tools' generic mark
 * for any future category name rather than rendering nothing. */
export function categoryIconFor(categoryName: string): keyof typeof CategoryIcon {
  const c = categoryName.toLowerCase();
  if (c.includes("front")) return "Frontend";
  if (c.includes("back")) return "Backend";
  if (c.includes("data")) return "Database";
  if (c.includes("deploy")) return "Deployment";
  return "Tools";
}

/** Keyword-matched against a skill's real name (never an exact-string
 * lookup table that would need hand-maintaining) - "Django / DRF" (the
 * real, combined backend skill entry) matches on "django", so both
 * verified technologies share the one real pill rather than a fabricated
 * second one. Returns null for anything outside the verified Core Stack,
 * which the caller must treat as "no individual icon" (falls back to the
 * category icon), never a guessed one. */
export function coreStackIconFor(skillName: string): keyof typeof CoreStackIcon | null {
  const s = skillName.toLowerCase();
  if (s.includes("python")) return "Python";
  if (s.includes("django")) return "Django";
  if (s.includes("postgres")) return "PostgreSQL";
  if (s.includes("react")) return "React";
  if (s.includes("docker")) return "Docker";
  return null;
}
