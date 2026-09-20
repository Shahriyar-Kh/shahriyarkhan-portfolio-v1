import Link from "next/link";
import { Connector } from "@/components/motif/connector";
import { Node } from "@/components/motif/node";
import { ServiceMedia } from "@/components/sections/service-media";
import { BreadcrumbNav } from "@/components/work/breadcrumb-nav";
import { ServiceNav } from "@/components/services/service-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import type { ServiceFraming } from "@/content/services";
import type { ServiceMediaEntry } from "@/content/services-media";
import type { Service } from "@/lib/api/types";

export interface ServiceDetailViewProps {
  service: Service;
  /** Absent for a service without a SERVICE_FRAMING entry (owner
   * judgment call #6) - the reduced template renders automatically. */
  framing: ServiceFraming | undefined;
  /** Absent only if SERVICES_MEDIA is ever missing an entry (it covers
   * the canonical service catalog) - the honest "media coming soon" fallback
   * renders instead, matching sections/service-catalogue-row.tsx. */
  media: ServiceMediaEntry | undefined;
  engagementSteps: readonly string[];
  relatedProjects: readonly { slug: string; title: string }[];
  /** Null when the sibling list fetch failed - prev/next simply
   * doesn't render rather than showing a broken control. */
  allServices: readonly Service[] | null;
}

/**
 * FINAL-DESIGN-01D-02 - the premium service-detail page. Composes a
 * real photo (ServiceMedia, reused as-is from the /services catalogue
 * and homepage - no new media system), the real API deliverables, the
 * real SERVICES_MEDIA techTags (the only place "relevant technology
 * context" can honestly come from - Service has no technologies field
 * of its own), the existing 7-step engagement process, and real related
 * work. Every framing-gated block (audience, problem, needed-to-begin,
 * related-work claim) preserves the exact same "reduced template"
 * precedent the pre-redesign page already established: a service
 * without a SERVICE_FRAMING entry (only when evidence-backed framing is available) simply omits that
 * block, never a fabricated placeholder in its place.
 */
export function ServiceDetailView({ service, framing, media, engagementSteps, relatedProjects, allServices }: ServiceDetailViewProps) {
  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <BreadcrumbNav items={[{ label: "Home", href: "/" }, { label: "Services", href: "/services" }, { label: service.title }]} />

        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-display-sm text-ink-primary">{service.title}</h1>
            <p className="mt-4 max-w-xl text-body text-ink-secondary">{service.description}</p>
            {media?.bestFor && <p className="mt-3 max-w-xl text-body-sm text-ink-tertiary italic">{media.bestFor}</p>}
            {framing?.audience && <p className="mt-2 max-w-xl text-caption-sm text-ink-hint">Helps: {framing.audience}</p>}

            {media && media.techTags.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {media.techTags.map((tag) => (
                  <li key={tag}>
                    <Badge>{tag}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <Button
              href={`/contact?intent=freelance_project&service=${service.id}`}
              className="mt-8"
              data-analytics-event="service_cta_click"
            >
              Request this service
            </Button>
          </div>

          <div className="aspect-3/2 w-full">
            {media ? (
              <ServiceMedia image={media.image} sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center border border-dashed border-border bg-paper-sunken">
                <span className="font-mono text-caption-sm text-ink-hint">Media coming soon</span>
              </div>
            )}
          </div>
        </div>
      </Section>

      {framing?.problemFraming && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">The problem this solves</h2>
          <p className="mt-3 max-w-2xl text-body-sm text-ink-secondary">{framing.problemFraming}</p>
        </Section>
      )}

      {service.deliverables.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">What&apos;s included</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {service.deliverables.map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                <Node aria-hidden className="mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {media?.scope && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">How it&apos;s built</h2>
          <p className="mt-3 max-w-2xl text-body-sm text-ink-secondary">{media.scope}</p>
        </Section>
      )}

      {framing && framing.whatIsNeededToBegin.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">What&apos;s needed to begin</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {framing.whatIsNeededToBegin.map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                <Node aria-hidden className="mt-1.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Engagement process</h2>
        <div className="relative mt-8">
          <div className="absolute top-3 right-0 left-0 hidden sm:block">
            <Connector />
          </div>
          <ol className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-0">
            {engagementSteps.map((step, i) => (
              <li key={step} className="relative flex flex-1 flex-col items-start gap-2 sm:items-center sm:text-center">
                <Node filled className="relative z-10 bg-background" size={8} />
                <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-body-sm font-medium text-ink-primary">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Related work</h2>
        <div className="mt-4">
          {relatedProjects.length === 0 ? (
            <div className="flex flex-col items-start gap-3 border border-dashed border-border p-6">
              <p className="max-w-md text-body-sm text-ink-secondary">
                No published project directly demonstrates this service yet - that doesn&apos;t mean it isn&apos;t a real capability, just that the evidence trail here is thin.
              </p>
              <Link href={`/contact?intent=freelance_project&service=${service.id}`} className="text-body-sm font-medium text-primary hover:underline">
                Discuss what you&apos;re building →
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {relatedProjects.map((project) => (
                <li key={project.slug}>
                  <Link href={`/work/${project.slug}`} className="text-body-sm text-primary hover:underline">
                    {project.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {allServices && <ServiceNav services={allServices} currentSlug={service.slug} />}
      </Section>
    </>
  );
}

export interface ServiceUnavailableViewProps {
  message: string;
}

/** A services-neutral unavailable state - the pre-redesign page reused
 * project-detail-view.tsx's ProjectUnavailableView here, whose fixed
 * title says "This project's details..." on a route that has nothing
 * to do with a project. */
export function ServiceUnavailableView({ message }: ServiceUnavailableViewProps) {
  return (
    <Section>
      <EmptyState title="This service's details are temporarily unavailable." description={message} />
    </Section>
  );
}
