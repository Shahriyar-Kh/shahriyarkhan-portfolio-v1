import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Section } from "@/components/ui/section";

/**
 * FINAL-DESIGN-01A-R5 Part A regression guard: `className` (background,
 * border, padding - the only kinds of class every real caller passes)
 * must land on the OUTER, full-bleed element, never on the width-
 * constrained inner shell. Before this split, a background class here
 * was trapped inside the same max-width box as the content - invisible
 * on a paper-on-paper section, a real full-bleed-background bug
 * everywhere a section wanted a distinct background color. jsdom doesn't
 * compute real layout/max-width, so this asserts the DOM *structure*
 * (which element gets which class) - the actual full-bleed measurement
 * is verified with real Puppeteer/CDP zoom emulation, documented in
 * docs/rebuild/FINAL_DESIGN_01A_R5_AUDIT_AND_REPORT.md.
 */
describe("Section", () => {
  it("puts caller className on the outer element, not the width-constrained inner shell", () => {
    const { container } = render(
      <Section className="bg-surface-olive border-t border-border-on-ink">content</Section>,
    );
    const outer = container.firstElementChild!;
    const inner = outer.firstElementChild!;
    expect(outer.className).toContain("bg-surface-olive");
    expect(outer.className).not.toContain("section-shell");
    expect(outer.className).not.toContain("shell-wide");
    expect(inner.className).not.toContain("bg-surface-olive");
  });

  it("defaults to the standard shell width, unchanged for every caller that doesn't opt into a variant", () => {
    const { container } = render(<Section>content</Section>);
    const inner = container.firstElementChild!.firstElementChild!;
    expect(inner.className).toContain("section-shell");
  });

  it("uses the shell-wide variant only when a caller explicitly opts in", () => {
    const { container } = render(<Section shell="wide">content</Section>);
    const inner = container.firstElementChild!.firstElementChild!;
    expect(inner.className).toContain("shell-wide");
  });

  it("uses the shell-readable variant only when a caller explicitly opts in", () => {
    const { container } = render(<Section shell="readable">content</Section>);
    const inner = container.firstElementChild!.firstElementChild!;
    expect(inner.className).toContain("shell-readable");
  });

  it("always renders the outer element at full width, regardless of shell variant", () => {
    for (const shell of ["standard", "wide", "readable"] as const) {
      const { container, unmount } = render(<Section shell={shell}>content</Section>);
      expect(container.firstElementChild!.className).toContain("w-full");
      unmount();
    }
  });
});
