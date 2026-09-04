import { publishableClaims } from "@/content/case-studies";
import type { CaseStudy } from "@/content/case-studies/types";

export interface ArchitectureDiagramProps {
  caseStudy: CaseStudy | null | undefined;
  className?: string;
}

interface Layer {
  label: string;
  keywords: readonly string[];
}

/** Four generic tiers, matched against whatever technology names actually
 * appear in the project's own verified `architecture` claim statements -
 * never a fixed per-project layout. A tier renders only when a real claim
 * actually names a matching technology. */
const LAYERS: readonly Layer[] = [
  { label: "Client", keywords: ["react", "next.js", "vue", "frontend", "browser"] },
  { label: "REST API", keywords: ["django rest framework", "drf", "django", "fastapi", "rest api", "express"] },
  { label: "Auth", keywords: ["jwt", "oauth", "authentication", "rbac"] },
  { label: "Data", keywords: ["postgresql", "postgres", "mysql", "mongodb", "redis", "storage"] },
];

/**
 * One real, evidence-based technical diagram (FINAL-DESIGN-01A-R3 §D) -
 * clearly a diagram, never a fake product screenshot. Built entirely
 * from the currently-featured project's own verified/inferred
 * `architecture` case-study claims: each tier only appears when a real
 * claim statement actually names a matching technology, and the whole
 * diagram renders nothing (not a sparse or misleading partial one)
 * unless at least two tiers have real support. No claim text is
 * invented - only technology keywords already present in the verified
 * statements decide which tiers light up.
 */
export function ArchitectureDiagram({ caseStudy, className }: ArchitectureDiagramProps) {
  if (!caseStudy) return null;

  const architectureSection = caseStudy.sections.find((s) => s.key === "architecture");
  if (!architectureSection) return null;

  const claims = publishableClaims(architectureSection);
  if (claims.length === 0) return null;

  const haystack = claims.map((c) => c.statement.toLowerCase()).join(" ");
  const matched = LAYERS.filter((layer) => layer.keywords.some((k) => haystack.includes(k)));

  if (matched.length < 2) return null;

  return (
    <div className={className}>
      <p className="font-mono text-label text-primary-on-ink uppercase">System architecture</p>
      <p className="mt-2 max-w-lg text-caption text-paper-tertiary">
        Drawn from this project&apos;s own verified architecture record - a real diagram, not a screenshot.
      </p>
      <div
        role="img"
        aria-label={`System architecture: ${matched.map((l) => l.label).join(" connected to ")}`}
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        {matched.map((layer, i) => (
          <div key={layer.label} className="flex items-center gap-3">
            <div className="border border-border-on-ink px-4 py-3 font-mono text-caption-sm text-paper-primary">
              {layer.label}
            </div>
            {i < matched.length - 1 && (
              <svg width="28" height="10" viewBox="0 0 28 10" aria-hidden focusable="false" className="text-primary-on-ink shrink-0">
                <path d="M0 5 H22 M18 1 L22 5 L18 9" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
