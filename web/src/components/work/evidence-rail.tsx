import { ExternalLink } from "@/components/ui/external-link";
import type { EvidenceLink } from "@/content/case-studies/types";

export interface EvidenceRailProps {
  evidence: readonly EvidenceLink[];
}

/** Evidence links strung on a single vertical Run (the border-l), with
 * mono verification dates. */
export function EvidenceRail({ evidence }: EvidenceRailProps) {
  const linkable = evidence.filter((e) => e.href);
  if (linkable.length === 0) return null;

  return (
    <ul className="flex flex-col gap-3 border-l border-primary pl-4">
      {linkable.map((item) => (
        <li key={item.href} className="text-body-sm">
          <ExternalLink href={item.href} className="text-primary hover:underline">
            {item.label}
          </ExternalLink>
          {item.verifiedOn && (
            <span className="ml-2 font-mono text-caption-sm text-ink-hint">verified {item.verifiedOn}</span>
          )}
          {item.capturedApprox && (
            <span className="ml-2 font-mono text-caption-sm text-ink-hint">captured ~{item.capturedApprox}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
