import Image from "next/image";
import { assetUrl } from "@/lib/assets";
import type { Project } from "@/lib/api/types";

export interface ProjectMediaProps {
  project: Pick<Project, "title" | "preview_image" | "featured_image" | "alt_text" | "image_alt_text">;
  variant?: "card" | "hero";
  /** Overrides the variant's default `sizes` hint for a caller with a
   * genuinely different layout (e.g. a 2-column homepage grid vs. a
   * 3-column /work grid) - avoids requesting a larger image than the
   * slot actually renders at. */
  sizes?: string;
  /** Only the single largest above-the-fold image on a page should set
   * this - it disables lazy-loading and requests eager/high-priority
   * decoding, exactly like next/image's own `priority` prop. */
  priority?: boolean;
}

const DEFAULT_SIZES: Record<NonNullable<ProjectMediaProps["variant"]>, string> = {
  hero: "(min-width: 1024px) 50vw, 100vw",
  card: "(min-width: 768px) 33vw, 100vw",
};

/** Alt resolution order: image_alt_text -> alt_text -> "Screenshot of
 * {title}". Renders nothing when both images are null - the caller
 * falls back to a typographic tile, never a stock placeholder. */
export function ProjectMedia({ project, variant = "card", sizes, priority = false }: ProjectMediaProps) {
  const source = project.featured_image ?? project.preview_image;
  if (!source) return null;

  const alt = project.image_alt_text || project.alt_text || `Screenshot of ${project.title}`;

  return (
    <Image
      src={assetUrl(source)}
      alt={alt}
      fill
      sizes={sizes ?? DEFAULT_SIZES[variant]}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      className="object-cover"
    />
  );
}
