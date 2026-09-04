import { ClaimBadge } from "@/components/work/claim-badge";
import { EvidenceRail } from "@/components/work/evidence-rail";
import { LimitationsNote } from "@/components/work/limitations-note";
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
 */
export function ProjectCaseSections({ content }: ProjectCaseSectionsProps) {
  if (content.isEmpty && content.evidence.length === 0 && content.limitations.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      {content.apiSections.map((section) => (
        <div key={section.key}>
          <h2 className="text-headline-sm text-ink-primary">{section.heading}</h2>
          <p className="mt-2 text-body-sm text-ink-secondary">{section.body}</p>
        </div>
      ))}

      {content.editorialSections.map((section) => {
        const claims = publishableClaims(section);
        return (
          <div key={section.key}>
            <h2 className="text-headline-sm text-ink-primary">{section.heading}</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {claims.map((claim) => (
                <li key={claim.id} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                  <ClaimBadge status={claim.status} className="mt-1" />
                  <span>{claim.statement}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {content.evidence.length > 0 && (
        <div>
          <h2 className="text-headline-sm text-ink-primary">Evidence</h2>
          <div className="mt-3">
            <EvidenceRail evidence={content.evidence} />
          </div>
        </div>
      )}

      <LimitationsNote limitations={content.limitations} />
    </div>
  );
}
