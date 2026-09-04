import { Node } from "@/components/motif/node";
import { SKILL_LEVEL_LABELS, type SkillLevel } from "@/lib/api/types";
import { cn } from "@/lib/cn";

export interface LevelTrackProps {
  level: SkillLevel;
  /** When given, the wrapping span's accessible name becomes
   * "{skillName} — {level label}" (e.g. "React — Advanced") so
   * assistive tech announces the pairing as one unit instead of reading
   * the skill name and the level label as two disconnected pieces
   * (FINAL-DESIGN-01A-R3 §D). Purely additive - the visible text is
   * unchanged either way. */
  skillName?: string;
  className?: string;
  /** Node square size in px - default (6) matches the original compact
   * list treatment (skills-view.tsx); the homepage's capability console
   * passes a larger value for a more substantial rail. */
  nodeSize?: number;
}

/**
 * A visually expressive stand-in for a proficiency bar that still maps
 * honestly to the categorical 1-4 backend level: 4 Node marks, filled up
 * to `level`, no interpolation and no invented percentage in between.
 * The label text (Beginner/Intermediate/Advanced/Expert) is the actual
 * source of truth - the marks are a decoration of it, not a separate
 * numeric claim.
 */
export function LevelTrack({ level, skillName, className, nodeSize = 6 }: LevelTrackProps) {
  const label = SKILL_LEVEL_LABELS[level];
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label={skillName ? `${skillName} — ${label}` : undefined}>
      <span className="flex items-center gap-1.5" data-capability-node aria-hidden="true">
        {([1, 2, 3, 4] as const).map((step) => (
          <Node key={step} size={nodeSize} filled={step <= level} />
        ))}
      </span>
      <span className="font-mono text-caption-sm text-ink-tertiary" aria-hidden={Boolean(skillName)}>
        {label}
      </span>
    </span>
  );
}
