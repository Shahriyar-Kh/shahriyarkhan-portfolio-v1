import { ClaimBadge } from "@/components/work/claim-badge";
import { EvidenceRail } from "@/components/work/evidence-rail";
import { LimitationsNote } from "@/components/work/limitations-note";
import { Node } from "@/components/motif/node";
import { publishableClaims } from "@/content/case-studies";
import type { ResolvedCaseContent } from "@/lib/case-study-merge";

export interface ProjectCaseSectionsProps {
  content: ResolvedCaseContent;
}

/**
 * Renders NOTHING when content.isEmpty - no heading, no empty shell.
 * Today, for most projects, this means only the API-derived sections
 * appear (if any) plus the evidence rail and limitations note; the
 * editorial register sections light up automatically once a project has
 * one (see lib/case-study-merge.ts's resolveCaseContent for the
 * API-wins precedence rule).
 *
 * FINAL-DESIGN-01C-02: adds a single, visible legend for the
 * filled/hollow Node marks claim-badge.tsx already draws - previously
 * that distinction was sr-only, so a sighted visitor saw two different
 * square styles with no on-page explanation of what they meant.
 */
export function ProjectCaseSections({ content }: ProjectCaseSectionsProps) {
  if (content.isEmpty && content.evidence.length === 0 && content.limitations.length === 0) {
    return null;
  }

  const hasEditorialClaims = content.editorialSections.length > 0;

  return (
    <div className="flex flex-col gap-10">
      {hasEditorialClaims && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4 font-mono text-caption-sm text-ink-tertiary">
          <span className="flex items-center gap-1.5">
            <Node filled /> Verified against direct evidence
          </span>
          <span className="flex items-center gap-1.5">
            <Node /> Conservatively stated
          </span>
        </div>
      )}

      {content.apiSections.map((section) => (
        <div key={section.key}>
          <h2 className="text-headline-md text-ink-primary">{section.heading}</h2>
          <p className="mt-3 text-body-sm text-ink-secondary">{section.body}</p>
        </div>
      ))}

      {content.editorialSections.map((section) => {
        const claims = publishableClaims(section);
        return (
          <div key={section.key}>
            <h2 className="text-headline-md text-ink-primary">{section.heading}</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {claims.map((claim) => (
                <li key={claim.id} className="flex items-start gap-2.5 text-body-sm text-ink-secondary">
                  <ClaimBadge status={claim.status} className="mt-1.5" />
                  <span>{claim.statement}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {content.evidence.length > 0 && (
        <div>
          <h2 className="text-headline-md text-ink-primary">Evidence</h2>
          <div className="mt-4">
            <EvidenceRail evidence={content.evidence} />
          </div>
        </div>
      )}

      <LimitationsNote limitations={content.limitations} />
    </div>
  );
}
