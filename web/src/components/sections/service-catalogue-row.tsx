import Link from "next/link";
import { Node } from "@/components/motif/node";
import { ServiceMedia } from "@/components/sections/service-media";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ServiceFraming } from "@/content/services";
import type { ServiceMediaEntry } from "@/content/services-media";
import type { Service } from "@/lib/api/types";
import { cn } from "@/lib/cn";

export interface ServiceCatalogueRowProps {
  service: Service;
  index: number;
  media: ServiceMediaEntry | undefined;
  framing: ServiceFraming | undefined;
  /** Real titles for `framing.relatedProjectSlugs`, resolved by the
   * caller against the live Project list - a slug with no match (a
   * fetch failure, or a stale slug) is silently dropped, never shown as
   * a broken link. */
  relatedProjects: readonly { slug: string; title: string }[];
}

/**
 * FINAL-DESIGN-01D-01 - one row of the /services catalogue. Deliberately
 * NOT the homepage's bento/tilt/spotlight "capability studio"
 * (sections/services-capability.tsx, untouched): every row here shares
 * the exact same image-left/content-right editorial shape (image
 * position never alternates), reading as a plain, complete catalogue
 * rather than a curated highlight reel. Reuses ServiceMedia as-is (the
 * same real-photo pan/scale treatment already approved on the
 * homepage) rather than a second media component.
 *
 * A service with no SERVICE_FRAMING entry (3 of 7 today) simply omits
 * the audience/problem/related-work lines - never a fabricated
 * placeholder in their place, matching service-detail-view.tsx's own
 * "reduced template" precedent exactly.
 */
export function ServiceCatalogueRow({ service, index, media, framing, relatedProjects }: ServiceCatalogueRowProps) {
  return (
    <article className="grid gap-8 border-t border-border py-12 first:border-t-0 first:pt-0 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12">
      <div className={cn("aspect-3/2 w-full", index % 2 === 1 && "lg:order-2")}>
        {media ? (
          <ServiceMedia image={media.image} sizes="(min-width: 1024px) 45vw, 100vw" className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center border border-dashed border-border bg-paper-sunken">
            <span className="font-mono text-caption-sm text-ink-hint">Media coming soon</span>
          </div>
        )}
      </div>

      <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
        <span className="font-mono text-caption text-ink-hint">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="mt-2 text-headline-lg text-ink-primary">
          <Link href={`/services/${service.slug}`} className="hover:text-primary">
            {service.title}
          </Link>
        </h2>
        <p className="mt-3 max-w-xl text-body-sm text-ink-secondary">{service.description}</p>

        {media?.bestFor && <p className="mt-3 max-w-xl text-body-sm text-ink-tertiary italic">{media.bestFor}</p>}
        {framing?.audience && <p className="mt-2 max-w-xl text-caption-sm text-ink-hint">Helps: {framing.audience}</p>}

        {service.deliverables.length > 0 && (
          <ul className="mt-5 flex flex-col gap-1.5">
            {service.deliverables.slice(0, 4).map((item) => (
              <li key={item} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                <Node className="mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {media && media.techTags.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {media.techTags.map((tag) => (
              <li key={tag}>
                <Badge>{tag}</Badge>
              </li>
            ))}
          </ul>
        )}

        {relatedProjects.length > 0 && (
          <p className="mt-4 text-caption-sm text-ink-hint">
            Related work:{" "}
            {relatedProjects.map((project, i) => (
              <span key={project.slug}>
                {i > 0 && ", "}
                <Link href={`/work/${project.slug}`} className="text-primary hover:underline">
                  {project.title}
                </Link>
              </span>
            ))}
          </p>
        )}

        <Link href={`/services/${service.slug}`} className="mt-6 inline-flex items-center gap-1 text-body-sm font-medium text-primary hover:underline">
          Service details <Icon.ArrowRight size={14} aria-hidden />
        </Link>
      </div>
    </article>
  );
}
