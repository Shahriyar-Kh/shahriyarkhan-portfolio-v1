import { DualCta } from "@/components/sections/dual-cta";
import { ServiceCatalogueRow } from "@/components/sections/service-catalogue-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SERVICE_FRAMING } from "@/content/services";
import { SERVICES_INTRO } from "@/content/services-catalogue";
import { SERVICES_MEDIA } from "@/content/services-media";
import type { Project, Service } from "@/lib/api/types";

export interface ServicesViewProps {
  services: readonly Service[] | null;
  /** Null when the fetch failed - related-work links simply don't
   * render rather than showing a broken or misleading link. */
  projects: readonly Project[] | null;
}

/**
 * FINAL-DESIGN-01D-01 - the premium /services catalogue. Plain,
 * synchronous, prop-driven (matching work-view.tsx's own precedent),
 * so it's testable without a Server Component harness.
 */
export function ServicesView({ services, projects }: ServicesViewProps) {
  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading as="h1" eyebrow={SERVICES_INTRO.eyebrow} title={SERVICES_INTRO.title} subtitle={SERVICES_INTRO.lead} />
        {services && services.length > 0 && (
          <p className="mt-2 font-mono text-caption-sm text-ink-hint">
            {services.length} service{services.length === 1 ? "" : "s"}
          </p>
        )}

        <div className="mt-12">
          {!services ? (
            <EmptyState title="Service data is temporarily unavailable." description="Please try again shortly, or get in touch directly." />
          ) : services.length === 0 ? (
            <EmptyState title="No published services yet." />
          ) : (
            services.map((service, index) => {
              const framing = SERVICE_FRAMING[service.slug];
              const relatedProjects = (framing?.relatedProjectSlugs ?? [])
                .map((slug) => projects?.find((p) => p.slug === slug))
                .filter((p): p is NonNullable<typeof p> => Boolean(p))
                .map((p) => ({ slug: p.slug, title: p.title }));

              return (
                <ServiceCatalogueRow
                  key={service.id}
                  service={service}
                  index={index}
                  media={SERVICES_MEDIA[service.slug]}
                  framing={framing}
                  relatedProjects={relatedProjects}
                />
              );
            })
          )}
        </div>
      </Section>

      <DualCta />
    </>
  );
}
