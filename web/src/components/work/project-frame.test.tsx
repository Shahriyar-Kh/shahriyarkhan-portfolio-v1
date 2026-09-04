import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ alt, ...rest }: { src: string; alt: string }) => <img alt={alt} {...rest} />,
}));
vi.mock("@/components/work/project-screenshots", () => ({
  PROJECT_SCREENSHOTS: {
    "tall-project": { path: "/images/projects/tall-project.webp", sourceUrl: "https://tall-project.example.com", width: 1280, height: 3200 },
  },
}));

import { ProjectFrame } from "@/components/work/project-frame";
import type { Project } from "@/lib/api/types";

function makeProject(overrides: Partial<Project>): Project {
  return {
    id: 1,
    title: "Sample Project",
    slug: "sample-project",
    description: "A sample project.",
    technologies: [],
    live_url: "",
    github_url: "",
    preview_image: null,
    featured_image: null,
    alt_text: "",
    ai_summary: "",
    featured: false,
    status: "published",
    published_at: "2026-01-01T00:00:00Z",
    display_order: 0,
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
    og_title: "",
    og_description: "",
    image_alt_text: "",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ProjectFrame - fallback selection", () => {
  it("renders the honest SkMark tile when there is no screenshot and no API image", () => {
    render(<ProjectFrame project={makeProject({ slug: "no-media", title: "No Media Project" })} />);
    expect(screen.getByText("No Media Project")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the existing verified API image statically when no local screenshot exists for the slug", () => {
    render(
      <ProjectFrame
        project={makeProject({ slug: "api-media", title: "API Media Project", featured_image: "https://res.cloudinary.com/demo/image.png" })}
      />,
    );
    expect(screen.getByAltText("Screenshot of API Media Project")).toBeInTheDocument();
    expect(screen.queryByText("Open live project")).not.toBeInTheDocument();
  });

  it("renders the browser-chrome frame with a real screenshot when the slug has one", () => {
    render(<ProjectFrame project={makeProject({ slug: "tall-project", title: "Tall Project" })} liveUrl="https://tall-project.example.com" />);
    expect(screen.getByAltText("Screenshot of Tall Project")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open live project/i })).toHaveAttribute("href", "https://tall-project.example.com");
  });
});

describe("ProjectFrame - pan eligibility", () => {
  it("enables pan when the loaded image genuinely overflows the frame's window", () => {
    const { container } = render(<ProjectFrame project={makeProject({ slug: "tall-project" })} liveUrl="https://tall-project.example.com" />);

    const img = screen.getByAltText(/screenshot of/i);
    const windowEl = img.parentElement as HTMLElement;
    vi.spyOn(img, "getBoundingClientRect").mockReturnValue({ height: 800 } as DOMRect);
    vi.spyOn(windowEl, "getBoundingClientRect").mockReturnValue({ height: 300 } as DOMRect);

    fireEvent.load(img);

    const frame = container.querySelector("[data-pan-frame]");
    expect(frame).toHaveAttribute("data-pan-eligible", "true");
  });

  it("never enables pan for a near-square image with no meaningful overflow", () => {
    const { container } = render(<ProjectFrame project={makeProject({ slug: "tall-project" })} liveUrl="https://tall-project.example.com" />);

    const img = screen.getByAltText(/screenshot of/i);
    const windowEl = img.parentElement as HTMLElement;
    vi.spyOn(img, "getBoundingClientRect").mockReturnValue({ height: 305 } as DOMRect);
    vi.spyOn(windowEl, "getBoundingClientRect").mockReturnValue({ height: 300 } as DOMRect);

    fireEvent.load(img);

    const frame = container.querySelector("[data-pan-frame]");
    expect(frame).not.toHaveAttribute("data-pan-eligible");
  });

  it("wires no timer or IntersectionObserver for the pan itself - it only ever responds to real hover/focus via CSS", () => {
    const ioSpy = vi.fn();
    class SpyIO {
      constructor() {
        ioSpy();
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).IntersectionObserver = SpyIO;
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    render(<ProjectFrame project={makeProject({ slug: "tall-project" })} liveUrl="https://tall-project.example.com" />);

    expect(ioSpy).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });
});

describe("ProjectFrame - pan CSS stays reduced-motion-safe", () => {
  it("the pan transform rule in globals.css is scoped inside prefers-reduced-motion: no-preference (and fine-pointer hover)", () => {
    const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
    const panBlockStart = css.indexOf("[data-pan-frame]");
    expect(panBlockStart).toBeGreaterThan(-1);
    const precedingContext = css.slice(Math.max(0, panBlockStart - 400), panBlockStart);
    expect(precedingContext).toContain("prefers-reduced-motion: no-preference");
    expect(precedingContext).toContain("hover: hover");
    expect(precedingContext).toContain("pointer: fine");
  });
});
