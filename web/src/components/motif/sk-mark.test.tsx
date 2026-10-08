import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkMark } from "@/components/motif/sk-mark";

describe("SkMark", () => {
  it("renders the refined SK monogram SVG with 32x32 viewBox", () => {
    const { container } = render(<SkMark />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("viewBox", "0 0 32 32");
  });

  it("renders the brand accent enclosure with data-brand-accent attribute", () => {
    const { container } = render(<SkMark tone="on-ink" />);
    const accent = container.querySelector('[data-brand-accent="true"]');
    expect(accent).toBeInTheDocument();
    expect(accent).toHaveClass("stroke-primary-on-ink");
  });

  it("applies brand and mono tones appropriately", () => {
    const { container: brandContainer } = render(<SkMark tone="brand" />);
    const brandAccent = brandContainer.querySelector('[data-brand-accent="true"]');
    expect(brandAccent).toHaveClass("stroke-primary");

    const { container: monoContainer } = render(<SkMark tone="mono" />);
    const monoAccent = monoContainer.querySelector('[data-brand-accent="true"]');
    expect(monoAccent).toHaveClass("stroke-current");
  });

  it("applies pulse animation class when pulse prop is true", () => {
    const { container } = render(<SkMark pulse />);
    const accent = container.querySelector('[data-brand-accent="true"]');
    expect(accent?.getAttribute("class")).toContain("sk-pulse");
  });
});
