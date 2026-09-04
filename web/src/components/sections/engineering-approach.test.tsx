import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/motion/gsap-client", () => ({
  getGsap: () => null,
  isMobileViewport: () => false,
}));

import { EngineeringApproach } from "@/components/sections/engineering-approach";
import { ENGAGEMENT_STEPS } from "@/content/services";

/**
 * FINAL-DESIGN-01A-R3 regression test: this is one of the sections named
 * in the reported blank-content defect. With GSAP unavailable, every
 * process step's real content must still render - the delivery-line
 * draw is decorative-only and never gates the step text itself.
 */
describe("EngineeringApproach - GSAP unavailable", () => {
  it("renders every engagement step even when GSAP fails to load", () => {
    render(<EngineeringApproach />);
    for (const step of ENGAGEMENT_STEPS) {
      expect(screen.getAllByText(step).length).toBeGreaterThan(0);
    }
  });
});
