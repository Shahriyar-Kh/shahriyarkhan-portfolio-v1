import Link from "next/link";
import { CornerFrame } from "@/components/motif/corner-frame";
import { Node } from "@/components/motif/node";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SERVICE_FRAMING } from "@/content/services";
import type { Service } from "@/lib/api/types";

export interface ServicesViewProps {
  services: readonly Service[] | null;
}

export function ServicesView({ services }: ServicesViewProps) {
  return (
    <Section className="pt-16 sm:pt-20">
      <SectionHeading
        eyebrow="Services"
        title="Services"
        subtitle="Backend engineering, REST API development, and full-stack web applications."
      />

      <div className="mt-10">
        {!services ? (
          <EmptyState title="Service data is temporarily unavailable." />
        ) : services.length === 0 ? (
          <EmptyState title="No published services yet." />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const hasFraming = Boolean(SERVICE_FRAMING[service.slug]);
              return (
                <CornerFrame key={service.id} className="flex h-full flex-col gap-3 p-6">
                  <div className="flex items-center gap-2">
                    <Node filled={hasFraming} />
                    <Link href={`/services/${service.slug}`} className="text-headline-sm text-ink-primary hover:text-primary">
                      {service.title}
                    </Link>
                  </div>
                  <p className="line-clamp-3 text-body-sm text-ink-secondary">{service.description}</p>
                  <Link href={`/services/${service.slug}`} className="mt-auto text-caption-sm text-primary hover:underline">
                    Details →
                  </Link>
                </CornerFrame>
              );
            })}
          </div>
        )}
      </div>
    </Section>
  );
}
