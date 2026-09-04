import Link from "next/link";
import { Connector } from "@/components/motif/connector";
import { Node } from "@/components/motif/node";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import type { ServiceFraming } from "@/content/services";
import type { Service } from "@/lib/api/types";

export interface ServiceDetailViewProps {
  service: Service;
  /** Absent for a service without a SERVICE_FRAMING entry (owner
   * judgment call #6) - the reduced template renders automatically. */
  framing: ServiceFraming | undefined;
  engagementSteps: readonly string[];
  relatedProjects: readonly { slug: string; title: string }[];
}

export function ServiceDetailView({ service, framing, engagementSteps, relatedProjects }: ServiceDetailViewProps) {
  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <h1 className="text-display-sm text-ink-primary">{service.title}</h1>
        <p className="mt-4 max-w-2xl text-body text-ink-secondary">{service.description}</p>
        {framing && <p className="mt-3 max-w-2xl text-body-sm text-ink-tertiary">{framing.audience}</p>}
        <Button
          href={`/contact?intent=freelance_project&service=${service.id}`}
          className="mt-6"
          data-analytics-event="service_cta_click"
        >
          Request this service
        </Button>
      </Section>

      {framing && (
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

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Engagement process</h2>
        <ol className="relative mt-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-0">
          <div className="absolute top-3 right-0 left-0 hidden sm:block">
            <Connector />
          </div>
          {engagementSteps.map((step, i) => (
            <li key={step} className="relative flex flex-1 flex-col items-start gap-2 sm:items-center sm:text-center">
              <Node filled className="relative z-10 bg-background" size={8} />
              <span className="font-mono text-caption-sm text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-body-sm font-medium text-ink-primary">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

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
        <h2 className="text-headline-md text-ink-primary">Related work</h2>
        <div className="mt-4">
          {relatedProjects.length === 0 ? (
            <EmptyState title="No published project directly demonstrates this service yet." />
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
      </Section>
    </>
  );
}
