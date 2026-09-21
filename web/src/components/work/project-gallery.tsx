"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import { ProjectFrame } from "@/components/work/project-frame";
import { PROJECT_SCREENSHOTS } from "@/components/work/project-screenshots";
import type { Project } from "@/lib/api/types";

export interface ProjectGalleryProps {
  project: Project;
  liveUrl?: string;
}

/**
 * FINAL-DESIGN-01C-02: a real-image viewer for the case-study page.
 * Today every project has at most one visual asset (a registered
 * evidence image, an explicitly labelled concept illustration, a live
 * API image, or neither) - see
 * project-screenshots.ts and types.ts's doc comment forbidding a
 * fabricated multi-image gallery (two prior attempts to add one were
 * reverted after production incidents). This is genuinely a single-item
 * viewer today, not a carousel dressed up to look like one.
 *
 * The inline frame reuses ProjectFrame as-is (its evidence image /
 * labelled illustration / API-image / honest-SkMark fallback is already
 * privacy-reviewed and approved elsewhere on the site). Clicking a REAL
 * image (never the SkMark placeholder - there is nothing to zoom into)
 * opens a focus-trapped, Escape-dismissible lightbox for a larger view,
 * matching mobile-nav.tsx's established focus-trap pattern exactly -
 * this is what makes a single-image viewer genuinely "keyboard-
 * accessible gallery interaction" rather than just a bigger picture.
 */
export function ProjectGallery({ project, liveUrl }: ProjectGalleryProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const screenshot = PROJECT_SCREENSHOTS[project.slug];
  const hasApiMedia = Boolean(project.featured_image || project.preview_image);
  const hasRealImage = Boolean(screenshot) || hasApiMedia;
  const apiImageSrc = project.featured_image ?? project.preview_image ?? null;
  const imageAlt = screenshot?.alt || project.image_alt_text || project.alt_text || `Screenshot of ${project.title}`;

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    dialog?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <div className="relative overflow-hidden rounded-sm border border-border">
        <div className="aspect-video w-full">
          <ProjectFrame project={project} liveUrl={liveUrl} className="h-full w-full" sizes="(min-width: 1024px) 50vw, 100vw" />
        </div>
        {hasRealImage && (
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 border border-border-on-ink bg-ink/80 px-3 py-1.5 font-mono text-caption-sm text-paper-primary backdrop-blur-sm hover:bg-ink"
          >
            <Icon.ArrowUpRight size={12} aria-hidden /> View full size
          </button>
        )}
      </div>

      {open &&
        hasRealImage &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${project.title} visual, full size`}
            className="fixed inset-0 z-(--z-mobile-nav) flex items-center justify-center bg-ink/95 p-6"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close full-size view"
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center text-paper-primary hover:text-primary-on-ink"
            >
              <Icon.Close size={22} aria-hidden />
            </button>

            {screenshot ? (
              <>
                <Image
                  src={screenshot.path}
                  alt={imageAlt}
                  width={screenshot.width}
                  height={screenshot.height}
                  unoptimized
                  className="h-auto max-h-[85vh] w-auto max-w-[90vw]"
                />
                {screenshot.sourceKind === "illustrative" && (
                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 border border-border-on-ink bg-ink/90 px-3 py-1.5 font-mono text-caption-sm text-paper-primary">
                    Concept illustration
                  </p>
                )}
              </>
            ) : apiImageSrc ? (
              <div className="relative aspect-video max-h-[85vh] w-[90vw] max-w-5xl">
                <Image src={apiImageSrc} alt={imageAlt} fill unoptimized className="object-contain" />
              </div>
            ) : null}
          </div>,
          document.body,
        )}
    </>
  );
}
