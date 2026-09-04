"use client";

import Image from "next/image";
import { useRef, type SyntheticEvent } from "react";
import { cn } from "@/lib/cn";
import type { ServiceImage } from "@/content/services-media";

export interface ServiceMediaProps {
  image: ServiceImage;
  sizes: string;
  className?: string;
}

/** Below this many px of real overflow, panning would be an imperceptible
 * jitter rather than a meaningful reveal - matches
 * work/project-frame.tsx's own threshold exactly, since this reuses that
 * component's pan mechanic. */
const MIN_PAN_OVERFLOW_PX = 24;

/**
 * FINAL-DESIGN-01A-R6 Part B/C: real raster media for a service card.
 *
 * The two `image.kind`s render genuinely differently, not just via a
 * CSS switch, because the pan mechanic needs it:
 *
 * - "owned" (a real, genuinely-tall project/portfolio screenshot) is
 *   rendered at its real intrinsic `width`/`height` (never `fill`) -
 *   the exact technique `work/project-frame.tsx`'s `TallScreenshotFrame`
 *   already uses. A `fill` image's own box always exactly matches its
 *   container, so there would be nothing for the load handler below to
 *   measure; a natural-size image inside a shorter `overflow-hidden`
 *   window genuinely overflows it, which is what makes the auto-pan
 *   possible at all. Reuses that same component's exact CSS hook
 *   (`data-pan-frame`/`data-pan-eligible`/`data-pan-image`, the rule
 *   already in globals.css) rather than a second implementation.
 * - "illustrative" (an ordinary licensed photograph) is rendered with
 *   `fill` + `object-cover`, and is never pan-eligible (the load handler
 *   below only measures/arms owned screenshots) - it gets a separate,
 *   subtler scale/focal treatment from CSS scoped to
 *   `[data-media-kind="illustrative"]` instead, never vertically panned,
 *   per the brief's explicit "do not vertically auto-pan ordinary
 *   photographs" rule.
 *
 * Both share the same warm-border/inset-shadow treatment and are fully,
 * immediately visible with zero JS - the pan/scale is a decorative
 * overlay on top of already-correct content, gated in globals.css to
 * `(prefers-reduced-motion: no-preference) and (hover: hover) and
 * (pointer: fine)`.
 */
export function ServiceMedia({ image, sizes, className }: ServiceMediaProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    if (image.kind !== "owned") return;
    const frameEl = frameRef.current;
    const windowEl = windowRef.current;
    if (!frameEl || !windowEl) return;
    const renderedHeight = event.currentTarget.getBoundingClientRect().height;
    const windowHeight = windowEl.getBoundingClientRect().height;
    const overflow = renderedHeight - windowHeight;
    if (overflow > MIN_PAN_OVERFLOW_PX) {
      frameEl.style.setProperty("--pan-distance", `-${Math.round(overflow)}px`);
      frameEl.dataset.panEligible = "true";
    }
  }

  return (
    <div
      ref={frameRef}
      data-pan-frame
      data-media-kind={image.kind}
      className={cn("relative overflow-hidden rounded-md border border-primary-on-ink/20 shadow-elevation-sm", className)}
    >
      <div ref={windowRef} className="absolute inset-0 overflow-hidden">
        {image.kind === "owned" && image.width && image.height ? (
          <Image
            data-pan-image
            src={image.file}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={sizes}
            quality={80}
            loading="lazy"
            onLoad={handleLoad}
            className="w-full h-auto object-cover object-top"
          />
        ) : (
          <Image
            data-pan-image
            src={image.file}
            alt={image.alt}
            fill
            sizes={sizes}
            quality={80}
            loading="lazy"
            className="object-cover object-center"
          />
        )}
      </div>
      {/* Restrained warm/olive grade - a soft bottom gradient plus a hint
       * of olive, never enough to obscure the photograph or screenshot
       * text. Static (not hover-gated) so it reads consistently. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(25,28,15,0) 55%, rgba(25,28,15,0.32) 100%), rgba(85,89,31,0.06)",
        }}
      />
    </div>
  );
}
