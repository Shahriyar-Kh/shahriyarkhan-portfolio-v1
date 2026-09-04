"use client";

import Link from "next/link";
import { useRef } from "react";
import { SectionIndex } from "@/components/motif/section-index";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { ProjectFrame } from "@/components/work/project-frame";
import { TechList } from "@/components/work/tech-list";
import { getCaseStudy } from "@/content/case-studies";
import { isDistinctRepoUrl } from "@/lib/format";
import { selectFeaturedCase } from "@/lib/home-selection";
import { useScrollReveal } from "@/lib/motion/use-scroll-reveal";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/api/types";

export interface ProjectProofTimelineProps {
  projects: readonly Project[] | null;
}

/** A published-project count this large would make a single unbroken
 * timeline unreasonably long - past this, the rest stay reachable via
 * the closing "View all work" link instead of every one becoming its
 * own chapter. The real dataset today is 6 projects, well under this. */
const MAX_CHAPTERS = 10;

/** Decorative-only, per-chapter accent cycle (the project title's hover
 * color) - never applied to CTA/link text, which stays --primary
 * everywhere (see the "Read the full case study"/"View live" links
 * below). Orange remains the only action color on the page. Written as
 * complete literal class strings, not built by string concatenation, so
 * Tailwind's build-time class scanner can actually find and generate
 * them. */
const ACCENT_CLASSES = ["hover:text-primary", "hover:text-olive", "hover:text-clay"] as const;

/**
 * Section E - the "Project Proof Timeline" (FINAL-DESIGN-01A-R3 §B):
 * every published project becomes its own case-study chapter along a
 * center progress line, alternating left/right on desktop and collapsing
 * to a single left-edge-aligned column on mobile (images before text,
 * no hover-dependency). Replaces R2's lead/supporting/index tiers - the
 * brief's own wording ("each real project becomes active... as the
 * visitor scrolls") describes one uniform mechanism, not a hierarchy.
 *
 * Normal document flow throughout - no pinning, no min-height spacers.
 * The line's growth and each chapter's active-dot state are the only
 * GSAP-driven effects, both continuous scrubs/toggles (never `once`,
 * never opacity-gating real content) so a full-page screenshot capture
 * that never dispatches a real scroll event still shows every chapter's
 * text and media fully - see lib/motion/use-scroll-reveal.ts's doc
 * comment for the defect this replaces.
 */
export function ProjectProofTimeline({ projects }: ProjectProofTimelineProps) {
  if (!projects) {
    return (
      <div className="section-shell border-t border-border py-16 sm:py-20">
        <SectionIndex n="03" label="Work" className="mb-6" />
        <EmptyState title="Project data is temporarily unavailable." description="Please try again shortly, or get in touch directly." />
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="section-shell border-t border-border py-16 sm:py-20">
        <SectionIndex n="03" label="Work" className="mb-6" />
        <EmptyState title="No published projects yet." />
      </div>
    );
  }

  const featuredId = selectFeaturedCase(projects)?.id ?? null;
  const shown = projects.slice(0, MAX_CHAPTERS);
  const overflowCount = projects.length - shown.length;

  return (
    <div className="section-shell border-t border-border py-16 sm:py-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <SectionIndex n="03" label="Work" className="mb-6" />
          <h2 className="text-display-sm text-ink-primary sm:text-display-md">Selected work</h2>
        </div>
        <Link href="/work" className="hidden shrink-0 text-body-sm font-medium text-primary hover:underline sm:inline">
          View all work →
        </Link>
      </div>

      <TimelineBody projects={shown} featuredId={featuredId} />

      {overflowCount > 0 && (
        <p className="mt-10 text-body-sm text-ink-secondary">
          +{overflowCount} more published {overflowCount === 1 ? "project" : "projects"} -{" "}
          <Link href="/work" className="font-medium text-primary hover:underline">
            view all work →
          </Link>
        </p>
      )}

      <Link href="/work" className="mt-8 inline-block text-body-sm font-medium text-primary hover:underline sm:hidden">
        View all work →
      </Link>
    </div>
  );
}

function TimelineBody({ projects, featuredId }: { projects: readonly Project[]; featuredId: number | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useScrollReveal(rootRef, (api) => {
    if (fillRef.current) {
      api.gsap.to(fillRef.current, {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%", end: "bottom 30%", scrub: 0.6 },
      });
    }
  }, [projects.length]);

  return (
    <div ref={rootRef} className="relative mt-14">
      <div aria-hidden className="absolute inset-y-0 left-2.5 w-0.5 bg-border lg:left-1/2 lg:-translate-x-1/2" />
      <div
        ref={fillRef}
        aria-hidden
        className="absolute inset-y-0 left-2.5 w-0.5 origin-top scale-y-0 bg-primary lg:left-1/2 lg:-translate-x-1/2"
      />

      <ol className="flex flex-col gap-16 lg:gap-24">
        {projects.map((project, i) => (
          <Chapter key={project.id} project={project} index={i} isFeatured={project.id === featuredId} />
        ))}
      </ol>
    </div>
  );
}

function Chapter({ project, index, isFeatured }: { project: Project; index: number; isFeatured: boolean }) {
  const rowRef = useRef<HTMLLIElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const isReversed = index % 2 === 1;
  const accentClass = ACCENT_CLASSES[index % ACCENT_CLASSES.length];
  const caseStudy = getCaseStudy(project.slug);
  const distinctRepo = isDistinctRepoUrl(project.github_url);

  const liveUrl = caseStudy?.evidence.find((e) => e.kind === "live" && e.href)?.href || project.live_url;
  const repoUrl = caseStudy?.evidence.find((e) => e.kind === "repo" && e.href)?.href || (distinctRepo ? project.github_url : "");

  useScrollReveal(rowRef, (api) => {
    if (dotRef.current) {
      api.ScrollTrigger.create({
        trigger: rowRef.current,
        start: "top 60%",
        end: "bottom 40%",
        toggleClass: { targets: dotRef.current, className: "is-active" },
      });
    }
  }, [project.id]);

  return (
    <li ref={rowRef} className="relative grid grid-cols-1 gap-6 pl-8 lg:grid-cols-2 lg:items-center lg:gap-14 lg:pl-0">
      <span
        ref={dotRef}
        aria-hidden
        className="absolute top-1.5 -left-[calc(2rem-3px)] h-3 w-3 rounded-full bg-border ring-4 ring-background transition-transform duration-(--motion-base) lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 [&.is-active]:scale-125 [&.is-active]:bg-primary"
      />

      {/* min-w-0 on both grid items - found via FINAL-DESIGN-01A-R5's
       * extreme-zoom audit: at a narrow enough effective viewport (a
       * phone screen zoomed to 200%), the media column's own
       * `shrink-0` chrome-bar link (project-frame.tsx) is wide enough
       * that its un-shrinkable min-content size was inflating this
       * grid item's reported width even though it's visually clipped
       * by ProjectFrame's own overflow-hidden - a grid item's default
       * `min-width: auto` lets an unclippable descendant's intrinsic
       * size leak into the grid track's sizing regardless of any
       * overflow-hidden further down. */}
      <div className={cn("order-1 min-w-0", isReversed && "lg:order-2")}>
        <ProjectFrame
          project={project}
          liveUrl={liveUrl}
          className="aspect-video w-full"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>

      <div className={cn("order-2 min-w-0", isReversed && "lg:order-1")}>
        <span className="font-mono text-caption text-ink-hint">
          {String(index + 1).padStart(2, "0")}
          {isFeatured && " / Lead project"}
        </span>
        <h3 className="mt-2 text-headline-lg sm:text-display-sm">
          <Link href={`/work/${project.slug}`} className={cn("text-ink-primary", accentClass)}>
            {project.title}
          </Link>
        </h3>
        <p className="mt-3 max-w-lg text-body text-ink-secondary">{caseStudy?.summary ?? project.description}</p>

        <div className="mt-4">
          <TechList technologies={project.technologies} limit={6} />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={`/work/${project.slug}`}
            className="text-body-sm font-semibold text-primary hover:underline"
            data-analytics-event="project_cta_click"
          >
            Read the full case study →
          </Link>
          {liveUrl && (
            <ExternalLink
              href={liveUrl}
              className="inline-flex items-center gap-1 text-body-sm text-ink-tertiary hover:text-ink-primary"
              data-analytics-event="project_cta_click"
            >
              View live <Icon.ArrowUpRight size={14} aria-hidden />
            </ExternalLink>
          )}
          {repoUrl && (
            <ExternalLink
              href={repoUrl}
              className="inline-flex items-center gap-1 text-body-sm text-ink-tertiary hover:text-ink-primary"
              data-analytics-event="outbound_github"
            >
              Source <Icon.ArrowUpRight size={14} aria-hidden />
            </ExternalLink>
          )}
        </div>
      </div>
    </li>
  );
}
