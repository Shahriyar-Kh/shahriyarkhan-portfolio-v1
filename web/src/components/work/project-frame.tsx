"use client";

import Image from "next/image";
import { useRef, type SyntheticEvent } from "react";
import { ImageReveal } from "@/components/motif/image-reveal";
import { SkMark } from "@/components/motif/sk-mark";
import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { ProjectMedia } from "@/components/work/project-media";
import { PROJECT_SCREENSHOTS, type ProjectScreenshot } from "@/components/work/project-screenshots";
import { hostnameOf } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Project } from "@/lib/api/types";

export interface ProjectFrameProps {
  project: Project;
  /** Falls back to `project.live_url` if a screenshot exists but no
   * case-study evidence link was supplied. */
  liveUrl?: string;
  sizes?: string;
  className?: string;
}

/** Below this many px of real overflow, panning would be an imperceptible
 * jitter rather than a meaningful reveal - render statically instead. */
const MIN_PAN_OVERFLOW_PX = 32;

/**
 * Project media shared by the homepage and /work surfaces: a reviewed
 * tall capture with reduced-motion-safe pan, a reviewed landscape cover,
 * the API's verified image, or the honest SkMark tile. The registry owns
 * the display mode so a landscape dashboard is never misrepresented as a
 * full-page capture and no stock/fabricated screenshot is introduced.
 */
export function ProjectFrame({ project, liveUrl, sizes, className }: ProjectFrameProps) {
  const screenshot = PROJECT_SCREENSHOTS[project.slug];
  const hasApiMedia = Boolean(project.featured_image || project.preview_image);

  if (screenshot) {
    if (screenshot.display === "cover") {
      return <LocalCoverVisual screenshot={screenshot} sizes={sizes} className={className} />;
    }
    return <TallScreenshotFrame screenshot={screenshot} liveUrl={liveUrl || project.live_url} className={className} />;
  }

  if (hasApiMedia) {
    return (
      <ImageReveal className={className}>
        <ProjectMedia project={project} variant="card" sizes={sizes} />
      </ImageReveal>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col items-center justify-center gap-3 bg-ink text-paper-primary", className)}>
      <SkMark tone="mono" className="h-8 w-auto text-primary-on-ink" />
      <span className="px-6 text-center font-mono text-caption-sm text-paper-tertiary">{project.title}</span>
    </div>
  );
}

interface LocalCoverVisualProps {
  screenshot: ProjectScreenshot;
  sizes?: string;
  className?: string;
}

function LocalCoverVisual({ screenshot, sizes, className }: LocalCoverVisualProps) {
  return (
    <ImageReveal className={cn("relative", className)}>
      <Image
        src={screenshot.path}
        alt={screenshot.alt}
        fill
        sizes={sizes ?? "(min-width: 768px) 50vw, 100vw"}
        loading="lazy"
        className="object-cover object-top"
      />
      {screenshot.sourceKind === "illustrative" && (
        <span className="absolute right-3 bottom-3 border border-border-on-ink bg-ink/85 px-2.5 py-1 font-mono text-caption-sm text-paper-primary backdrop-blur-sm">
          Concept illustration
        </span>
      )}
    </ImageReveal>
  );
}

interface TallScreenshotFrameProps {
  screenshot: ProjectScreenshot;
  liveUrl: string;
  className?: string;
}

/**
 * The pan-eligibility flag and the `--pan-distance` custom property both
 * live on this OUTER wrapper (not just the inner scrollable "window") so
 * that `:focus-within` correctly fires from the chrome bar's "Open live
 * project" link too, not only from within the image area - a keyboard
 * user tabbing to that link gets the same pan preview a mouse user gets
 * on hover. `--pan-distance` is a real CSS custom property, so the
 * inner `[data-pan-image]` still reads it via normal inheritance even
 * though it's set higher up the tree.
 */
function TallScreenshotFrame({ screenshot, liveUrl, className }: TallScreenshotFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const domain = liveUrl ? hostnameOf(liveUrl) : "";

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
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
    <div ref={frameRef} data-pan-frame className={cn("flex flex-col overflow-hidden rounded-sm bg-ink", className)}>
      <div className="flex shrink-0 items-center gap-3 bg-ink-raised px-3 py-2">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-paper-tertiary/30" />
          <span className="h-2 w-2 rounded-full bg-paper-tertiary/30" />
          <span className="h-2 w-2 rounded-full bg-paper-tertiary/30" />
        </span>
        {domain && <span className="min-w-0 truncate font-mono text-caption-sm text-paper-tertiary">{domain}</span>}
        {liveUrl && (
          <ExternalLink
            href={liveUrl}
            className="ml-auto inline-flex shrink-0 items-center gap-1 font-mono text-caption-sm text-primary-on-ink hover:underline"
            data-analytics-event="project_cta_click"
          >
            Open live project <Icon.ArrowUpRight size={12} aria-hidden />
          </ExternalLink>
        )}
      </div>
      <div ref={windowRef} className="relative min-h-0 flex-1 overflow-hidden">
        <Image
          data-pan-image
          src={screenshot.path}
          alt={screenshot.alt}
          width={screenshot.width}
          height={screenshot.height}
          onLoad={handleLoad}
          loading="lazy"
          className="w-full"
        />
      </div>
    </div>
  );
}
