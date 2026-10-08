"use client";

import Link from "next/link";
import { useMemo, type PointerEvent as ReactPointerEvent } from "react";
import { Reveal } from "@/components/layout/reveal";
import { ServiceMedia } from "@/components/sections/service-media";
import { SectionIndex } from "@/components/motif/section-index";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SERVICES_MEDIA, type ServiceMediaEntry } from "@/content/services-media";
import { cn } from "@/lib/cn";
import type { Service } from "@/lib/api/types";

export interface ServicesCapabilityProps {
  services: readonly Service[] | null;
}

/**
 * Exactly six canonical services featured on the homepage in deliberate order:
 * 1. Custom Software Development
 * 2. Web Development
 * 3. Application Development
 * 4. SaaS Development
 * 5. Database Development
 * 6. Cloud Application Development
 */
const CANONICAL_HOME_SERVICE_SLUGS: readonly string[] = [
  "custom-software-development",
  "web-development",
  "application-development",
  "saas-development",
  "database-development",
  "cloud-application-development",
];

const CARD_IMAGE_SIZES = "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";

/**
 * Section F - Home Services Preview.
 * Renders exactly six equal cards in a structured responsive grid:
 * Desktop: 3 columns x 2 rows
 * Tablet: 2 columns
 * Mobile: 1 column
 *
 * All cards share identical visual height, equal media regions, and aligned
 * text and CTA positions. No masonry, no stretched cards, no fabricated claims.
 */
export function ServicesCapability({ services }: ServicesCapabilityProps) {
  const homeServices = useMemo(() => {
    if (!services || services.length === 0) return [];
    const bySlug = new Map(services.map((s) => [s.slug, s]));
    const ordered: Service[] = [];
    for (const slug of CANONICAL_HOME_SERVICE_SLUGS) {
      const match = bySlug.get(slug);
      if (match) ordered.push(match);
    }
    // Fallback if services use different slugs in tests
    if (ordered.length === 0) {
      return services.slice(0, 6);
    }
    return ordered.slice(0, 6);
  }, [services]);

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
        ) : homeServices.length === 0 ? (
          <EmptyState tone="paper" title="No published services yet." />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {homeServices.map((service, i) => (
              <Reveal key={service.id} delay={Math.min(i, 5) * 60} className="h-full">
                <ServiceCard service={service} index={i + 1} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <ArrowLink href="/services" className="text-paper-secondary hover:text-paper-primary">
          View all services
        </ArrowLink>
      </div>
    </Section>
  );
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const media = SERVICES_MEDIA[service.slug];

  return (
    <div
      data-service-card
      onPointerMove={handleCardPointerMove}
      onPointerLeave={handleCardPointerLeave}
      className="group relative flex h-full flex-col overflow-hidden border border-border-on-ink/80 bg-surface-olive-raised transition-colors duration-(--motion-base) hover:border-primary-on-ink/50 focus-within:border-primary-on-ink/50 shadow-elevation-sm"
    >
      <div className="relative aspect-16/10 w-full overflow-hidden shrink-0 border-b border-border-on-ink/40 bg-surface-olive">
        <ServiceCardMedia
          media={media}
          sizes={CARD_IMAGE_SIZES}
          className="h-full w-full"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/services/${service.slug}`}
            className="text-headline-sm font-semibold text-paper-primary hover:text-primary-on-ink transition-colors duration-(--motion-fast)"
          >
            {service.title}
          </Link>
          <span className="shrink-0 font-mono text-caption text-paper-hint">
            {String(index).padStart(2, "0")}
          </span>
        </div>

        <p className="mt-2.5 line-clamp-3 text-body-sm text-paper-secondary leading-relaxed">
          {service.description}
        </p>

        {media && media.techTags.length > 0 && (
          <div className="mt-4">
            <TechTags tags={media.techTags.slice(0, 4)} />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border-on-ink/40 pt-4 mt-6">
          <ArrowLink
            href={`/services/${service.slug}`}
            className="text-paper-tertiary group-hover:text-paper-primary"
          >
            Details
          </ArrowLink>
          <Button
            href="/contact?intent=freelance_project"
            size="sm"
            variant="secondary-on-ink"
            data-analytics-event="project_cta_click"
          >
            Request
          </Button>
        </div>
      </div>
    </div>
  );
}

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
