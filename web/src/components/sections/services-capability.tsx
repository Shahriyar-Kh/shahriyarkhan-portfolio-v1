"use client";

import Link from "next/link";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Reveal } from "@/components/layout/reveal";
import { ServiceMedia } from "@/components/sections/service-media";
import { SectionIndex } from "@/components/motif/section-index";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SERVICE_FRAMING } from "@/content/services";
import { SERVICES_MEDIA, type ServiceMediaEntry } from "@/content/services-media";
import { cn } from "@/lib/cn";
import type { Service } from "@/lib/api/types";

export interface ServicesCapabilityProps {
  services: readonly Service[] | null;
}

/** Alternating wide/narrow rhythm for the supporting bento cells, safe for
 * any item count - each pair sums to the container's 3 columns, so a
 * future service count never leaves a ragged half-filled row. The same
 * index parity also decides each card's media placement (see
 * SupportingService) - narrow cards stack media-over-text, wide cards
 * sit media-beside-text, so the supporting cards read as two
 * alternating compositions, never seven identical templates. */
const SUPPORTING_SPAN = ["lg:col-span-1", "lg:col-span-2"] as const;

/** A future/unexpected service slug (not in SERVICES_MEDIA) gets no
 * image at all - an honest text-only card - rather than a guessed photo
 * pretending to represent a service nobody has reviewed media for. */
const FALLBACK_SIZES = "(min-width: 1024px) 45vw, 100vw";

/**
 * Section F - a capability studio/bento layout. One featured capability
 * occupies a large editorial panel; the rest are bento cells of varied
 * proportions. FINAL-DESIGN-01A-R6: every card's media is now a real
 * raster image (components/sections/service-media.tsx) - either a real
 * screenshot of Shahriyar's own project/portfolio, or a licensed
 * photograph used only as illustrative atmosphere (see content/
 * services-media.ts's own doc comment on how those two are kept
 * distinguishable in data and never conflated in copy). The R5 SVG scene
 * renderer is gone from this section entirely.
 *
 * Every real API field (title, description, deliverables) renders
 * exactly as the API returns it. `bestFor`/`scope`/`techTags` are new,
 * frontend-only presentation copy (content/services-media.ts) built only
 * from the capability vocabulary the owner approved per service - never
 * a price, timeline, guarantee, or completed-project claim. "Helps:"
 * (SERVICE_FRAMING) stays a separate, narrower line reserved for
 * genuine evidence-backed audience framing tied to real related
 * projects - the two are never merged, so this section can't blur
 * "what I offer" with "what I've shipped."
 *
 * `shell="wide"` (see ui/section.tsx / globals.css's shell-system doc
 * comment) - a deliberate, documented wider content column for a section
 * whose job is visual, not dense text.
 *
 * Card entrance is the shared `Reveal` primitive (a "supporting section"
 * per the R3 motion hierarchy). The pointer spotlight/tilt/media-lift
 * interaction is separate, plain pointermove-driven CSS custom
 * properties (see globals.css's `[data-service-card]` rules) - gated to
 * fine pointer + real hover + motion-allowed, so touch and reduced-
 * motion visitors get the fully static card the base markup already
 * renders, with every image already visible with zero JS.
 */
export function ServicesCapability({ services }: ServicesCapabilityProps) {
  return (
    <Section shell="wide" className="border-t border-border-on-ink bg-surface-olive">
      <SectionIndex n="06" label="Services" tone="paper" className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-paper-primary sm:text-display-md">
        Capability built for how clients actually decide
      </h2>
      <p className="mt-4 max-w-xl text-body text-paper-tertiary">
        Six focused software-development services, each scoped around real engineering needs rather than generic packages.
      </p>

      <div className="mt-10">
        {!services ? (
          <EmptyState tone="paper" title="Service data is temporarily unavailable." />
        ) : services.length === 0 ? (
          <EmptyState tone="paper" title="No published services yet." />
        ) : (
          (() => {
            const [feature, ...rest] = services.slice(0, 6);
            return (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {feature && (
                  <Reveal className="lg:col-span-3">
                    <FeaturedService service={feature} />
                  </Reveal>
                )}
                {rest.map((service, i) => (
                  <Reveal key={service.id} delay={Math.min(i, 4) * 60} className={SUPPORTING_SPAN[i % 2]}>
                    <SupportingService service={service} index={i + 2} sideBySide={i % 2 === 1} />
                  </Reveal>
                ))}
              </div>
            );
          })()
        )}
      </div>

      <ArrowLink href="/services" className="mt-8 text-paper-secondary hover:text-paper-primary">
        View all services
      </ArrowLink>
    </Section>
  );
}

/** Sets --tilt-x/--tilt-y/--spot-x/--spot-y from real pointer position
 * (one write per move event, no animation loop); CSS in globals.css does
 * the rest and is itself gated to fine pointer + hover + motion-allowed,
 * so this handler firing on a touch/keyboard interaction (it won't - only
 * `pointermove` from a real pointer device calls it) is harmless even
 * without an extra JS-side check. Capped well under a full tilt (max
 * ~1.5deg) - restrained, not a gimmick. */
function handleCardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  card.style.setProperty("--tilt-y", `${((px - 0.5) * 3).toFixed(2)}deg`);
  card.style.setProperty("--tilt-x", `${((0.5 - py) * 3).toFixed(2)}deg`);
  card.style.setProperty("--spot-x", `${(px * 100).toFixed(1)}%`);
  card.style.setProperty("--spot-y", `${(py * 100).toFixed(1)}%`);
}

function handleCardPointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
  const card = event.currentTarget;
  card.style.removeProperty("--tilt-x");
  card.style.removeProperty("--tilt-y");
  card.style.removeProperty("--spot-x");
  card.style.removeProperty("--spot-y");
}

function TechTags({ tags, className }: { tags: readonly string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li key={tag} className="border border-primary-on-ink/25 px-2 py-0.5 font-mono text-caption-sm text-paper-tertiary">
          {tag}
        </li>
      ))}
    </ul>
  );
}

function FeaturedService({ service }: { service: Service }) {
  const framing = SERVICE_FRAMING[service.slug];
  const media = SERVICES_MEDIA[service.slug];
  return (
    <div
      data-service-card
      onPointerMove={handleCardPointerMove}
      onPointerLeave={handleCardPointerLeave}
      className="relative grid gap-8 overflow-hidden border-t-2 border-primary-on-ink bg-surface-olive-raised p-6 sm:p-8 lg:grid-cols-2 lg:items-center"
    >
      <div className="order-2 lg:order-1">
        {framing && <p className="font-mono text-caption text-paper-tertiary uppercase">Helps: {framing.audience}</p>}
        <Link href={`/services/${service.slug}`} className="mt-2 block text-headline-lg text-paper-primary hover:text-primary-on-ink sm:text-display-sm">
          {service.title}
        </Link>
        <p className="mt-4 max-w-lg text-body text-paper-secondary">{service.description}</p>
        {media && (
          <>
            <p className="mt-3 max-w-lg text-body-sm font-medium text-paper-primary">{media.bestFor}</p>
            <p className="mt-2 max-w-lg text-body-sm text-paper-tertiary">{media.scope}</p>
          </>
        )}
        {service.deliverables.length > 0 && (
          <ul className="mt-5 flex flex-col gap-1.5 font-mono text-caption-sm text-paper-tertiary">
            {service.deliverables.slice(0, 4).map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        )}
        {media && <TechTags tags={media.techTags} className="mt-4" />}
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Button href="/contact?intent=freelance_project" variant="primary-on-ink" data-analytics-event="project_cta_click">
            Request this service
          </Button>
          <ArrowLink href={`/services/${service.slug}`} className="text-paper-tertiary hover:text-paper-primary">
            Service details
          </ArrowLink>
        </div>
      </div>
      <ServiceCardMedia
        media={media}
        sizes={FALLBACK_SIZES}
        className="order-1 aspect-3/2 w-full lg:order-2"
      />
    </div>
  );
}

function SupportingService({ service, index, sideBySide }: { service: Service; index: number; sideBySide: boolean }) {
  const framing = SERVICE_FRAMING[service.slug];
  const media = SERVICES_MEDIA[service.slug];
  return (
    <div
      data-service-card
      onPointerMove={handleCardPointerMove}
      onPointerLeave={handleCardPointerLeave}
      className={cn(
        "group relative flex h-full overflow-hidden border border-border-on-ink bg-surface-olive-raised transition-colors duration-(--motion-base) hover:border-primary-on-ink/50 focus-within:border-primary-on-ink/50",
        sideBySide ? "flex-col sm:flex-row" : "flex-col",
      )}
    >
      <ServiceCardMedia
        media={media}
        sizes={sideBySide ? "(min-width: 640px) 42vw, 100vw" : "(min-width: 1024px) 33vw, 100vw"}
        className={cn("shrink-0", sideBySide ? "aspect-3/2 sm:aspect-auto sm:w-[42%]" : "aspect-3/2 w-full")}
      />
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/services/${service.slug}`} className="text-body font-semibold text-paper-primary group-hover:text-primary-on-ink">
            {service.title}
          </Link>
          <span className="shrink-0 font-mono text-caption text-paper-hint">{String(index).padStart(2, "0")}</span>
        </div>
        <p className="text-caption-sm text-paper-tertiary">{framing ? framing.audience : media?.bestFor}</p>
        <p className="line-clamp-2 text-body-sm text-paper-secondary">{service.description}</p>
        {service.deliverables.length > 0 && (
          <ul className="flex flex-col gap-1 font-mono text-caption-sm text-paper-tertiary">
            {service.deliverables.slice(0, 3).map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        )}
        {media && <TechTags tags={media.techTags.slice(0, 3)} />}
        <div className="mt-auto flex items-center gap-4 pt-1">
          <ArrowLink href={`/services/${service.slug}`} className="text-paper-tertiary group-hover:text-paper-primary">
            Details
          </ArrowLink>
          <ArrowLink href="/contact?intent=freelance_project" className="text-paper-tertiary group-hover:text-paper-primary">
            Request
          </ArrowLink>
        </div>
      </div>
    </div>
  );
}

/** An unmapped/future service slug (not yet in SERVICES_MEDIA) renders
 * an honest text-only placeholder instead of a guessed image - never
 * pretends a photo represents a service nobody has reviewed media for. */
function ServiceCardMedia({ media, sizes, className }: { media: ServiceMediaEntry | undefined; sizes: string; className?: string }) {
  if (!media) {
    return (
      <div
        aria-hidden
        className={cn("flex items-center justify-center border border-dashed border-border-on-ink/40 bg-surface-olive text-paper-hint", className)}
      >
        <span className="font-mono text-caption-sm">Media coming soon</span>
      </div>
    );
  }
  return <ServiceMedia image={media.image} sizes={sizes} className={className} />;
}

/** A text link whose trailing arrow moves on hover/focus - the shared
 * "CTA arrow movement" interaction (Part F). No hover-only information:
 * the arrow is always present, only its position changes. */
function ArrowLink({ href, children, className }: { href: string; children: string; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-1.5 text-body-sm font-medium transition-colors duration-(--motion-fast) ${className ?? ""}`}
    >
      {children}
      <span aria-hidden className="inline-block transition-transform duration-(--motion-fast) group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5">
        →
      </span>
    </Link>
  );
}
