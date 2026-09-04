import { StrokeIcon, type StrokeIconProps } from "@/components/icons/stroke-icon";

type IconProps = Omit<StrokeIconProps, "viewBox" | "children">;

/**
 * A small, hand-drawn set of original glyphs (FINAL-DESIGN-01A-R3 §D),
 * matching the SK signature motif's own stroke language (see
 * stroke-icon.tsx) - never a generic lucide icon, never a copied
 * reference-site mark. Covers exactly two consumers: the recruiter/
 * client conversion pathways (DualCta), and the three real evidence-link
 * kinds the case-study register already defines
 * (content/case-studies/types.ts's EvidenceLink.kind). Everything else
 * on the site (service glyphs, process numbering, technology badges)
 * deliberately keeps its existing, already-compliant treatment rather
 * than being swapped for one of these - see the R3 audit doc for why.
 */
export const ConceptIcon = {
  /** A credential/profile card - the recruiter pathway (DualCta). */
  Credential: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="4" y="4" width="16" height="16" />
      <circle cx="9.5" cy="10" r="2" fill="currentColor" stroke="none" />
      <path d="M7 16 H17 M7 13.2 H11" />
    </StrokeIcon>
  ),

  /** A project signal launching outward - the client/project pathway
   * (DualCta), reusing the same node-and-line vocabulary as sk-mark.tsx
   * and signal-line.tsx rather than a generic rocket/handshake glyph. */
  ProjectLaunch: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <rect x="4" y="11" width="9" height="9" />
      <path d="M13 11 L20 4 M15 4 H20 V9" />
      <circle cx="20" cy="4" r="1.8" fill="currentColor" stroke="none" />
    </StrokeIcon>
  ),

  /** EvidenceLink.kind "live" - a broadcasting node. */
  EvidenceLive: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <path d="M8 8 A6 6 0 0 0 8 16 M16 8 A6 6 0 0 1 16 16" />
    </StrokeIcon>
  ),

  /** EvidenceLink.kind "repo" - a version-control branch. */
  EvidenceRepo: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <circle cx="7" cy="6" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="12" r="2" />
      <path d="M7 8 V16 M7 12 H15" />
    </StrokeIcon>
  ),

  /** EvidenceLink.kind "screenshot" - a captured frame, echoing the
   * corner-frame motif already used elsewhere for "not a card." */
  EvidenceScreenshot: (props: IconProps) => (
    <StrokeIcon viewBox="0 0 24 24" {...props}>
      <path d="M4 8 V4 H8 M20 8 V4 H16 M4 16 V20 H8 M20 16 V20 H16" />
      <circle cx="12" cy="12" r="2.5" />
    </StrokeIcon>
  ),
} as const;
