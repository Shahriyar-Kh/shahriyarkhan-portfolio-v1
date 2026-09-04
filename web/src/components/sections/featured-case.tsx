"use client";

import Link from "next/link";
import { useRef } from "react";
import { Reveal } from "@/components/layout/reveal";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SectionIndex } from "@/components/motif/section-index";
import { ArchitectureDiagram } from "@/components/work/architecture-diagram";
import { ClaimBadge } from "@/components/work/claim-badge";
import { ProjectMedia } from "@/components/work/project-media";
import { Button } from "@/components/ui/button";
import { getCaseStudy, publishableClaims } from "@/content/case-studies";
import { selectFeaturedCase } from "@/lib/home-selection";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import type { Project } from "@/lib/api/types";

export interface FeaturedCaseProps {
  projects: readonly Project[] | null;
}

/**
 * A deep evidence spotlight on one project, chosen algorithmically by
 * selectFeaturedCase() (most verified claims, tie-broken by a distinct
 * repo) - never hardcoded. Rendered as the page's second ink band, right
 * after the Project Proof Timeline, so the contrast rhythm reads
 * Hero(ink) -> ... -> this(ink) -> ... -> Dual CTA(ink) -> Footer(ink),
 * never two dark bands in a row. Deliberately distinct from the
 * timeline's own chapter for the same project (different angle): this
 * one carries the verified-claims register (ClaimBadge markers) and, for
 * the specific project whose case study has a verified architecture
 * section, a real evidence-based diagram - never a second copy of the
 * descriptive overview.
 *
 * FINAL-DESIGN-01A-R3: this was one of the sections the owner's
 * screenshots showed rendering completely blank outside the initial
 * viewport (the reported "dark Featured Case content" defect). Content
 * is now wrapped in the shared `Reveal` primitive (a single spotlight
 * panel, not a scroll narrative, so it's a "supporting section" for
 * motion purposes) instead of the R2 `staggerReveal("[data-evidence-item]")`
 * opacity:0-then-ScrollTrigger call - see reveal.tsx's doc comment for
 * why that pattern could strand content invisible. The media parallax
 * stays GSAP (continuous scrub, never opacity-gated, safe as-is).
 */
export function FeaturedCase({ projects }: FeaturedCaseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  const project = projects && projects.length > 0 ? selectFeaturedCase(projects) : null;
  const caseStudy = project ? getCaseStudy(project.slug) : null;
  const claims = caseStudy?.sections.flatMap((section) => publishableClaims(section)).slice(0, 4) ?? [];
  const hasMedia = Boolean(project?.featured_image || project?.preview_image);

  useScrollReveal(rootRef, (api) => {
    if (!api.isMobile && mediaRef.current) {
      api.gsap.to(mediaRef.current, {
        yPercent: -5,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top bottom", end: "bottom top", scrub: 0.8 },
      });
    }
  }, [project?.id]);

  if (!project) return null;

  return (
    <div ref={rootRef} className="surface-ink">
      <div className="section-shell py-16 sm:py-20">
        <SectionIndex n="04" label="Evidence" tone="paper" className="mb-6" />
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="font-mono text-label text-primary-on-ink uppercase">A closer look</p>
            <h2 className="mt-3 text-display-sm text-paper-primary sm:text-display-md">{project.title}</h2>
            {caseStudy?.summary && <p className="mt-4 max-w-lg text-body text-paper-tertiary">{caseStudy.summary}</p>}

            {claims.length > 0 && (
              <ul className="mt-6 flex flex-col gap-3">
                {claims.map((claim) => (
                  <li key={claim.id} className="flex items-start gap-2 text-body-sm text-paper-secondary">
                    <ClaimBadge status={claim.status} className="mt-1" />
                    <span>{claim.statement}</span>
                  </li>
                ))}
              </ul>
            )}

            <Button href={`/work/${project.slug}`} variant="primary-on-ink" className="mt-8" data-analytics-event="project_cta_click">
              Read the full case study
            </Button>
          </Reveal>

          {hasMedia && (
            <div ref={mediaRef}>
              <ImageReveal className="aspect-video w-full rounded-sm bg-ink-raised">
                <ProjectMedia project={project} variant="hero" sizes="(min-width: 1024px) 50vw, 100vw" />
              </ImageReveal>
            </div>
          )}
        </div>

        <ArchitectureDiagram caseStudy={caseStudy} className="mt-14" />

        <Link href={`/work/${project.slug}`} className="sr-only">
          {project.title} case study
        </Link>
      </div>
    </div>
  );
}
