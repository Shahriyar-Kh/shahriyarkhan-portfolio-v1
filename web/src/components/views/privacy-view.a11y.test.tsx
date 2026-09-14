import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { PrivacyView } from "@/components/views/privacy-view";

describe("PrivacyView accessibility", () => {
  it("has no axe violations", async () => {
    const { container } = render(<PrivacyView />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
