import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ClientFaq } from "@/components/sections/client-faq";
import { CLIENT_FAQ } from "@/content/home";

/**
 * FINAL-DESIGN-01A-R4 Part F: the plus/minus glyph and the rounded
 * active-row highlight are both purely decorative/CSS - the real
 * question and answer text must always be present and keyboard-operable
 * regardless, since <details>/<summary> is this page's one
 * zero-JS-interactive element.
 */
describe("ClientFaq", () => {
  it("renders every real question, all collapsed by default", () => {
    render(<ClientFaq />);
    for (const item of CLIENT_FAQ) {
      const details = screen.getByText(item.question).closest("details");
      expect(details).not.toHaveAttribute("open");
    }
  });

  it("opens a question on click and exposes its answer text", async () => {
    const user = userEvent.setup();
    render(<ClientFaq />);
    const first = CLIENT_FAQ[0]!;
    const summary = screen.getByText(first.question);

    await user.click(summary);

    const details = summary.closest("details");
    expect(details).toHaveAttribute("open");
    expect(screen.getByText(first.answer)).toBeInTheDocument();
  });

  it("keeps the summary keyboard-focusable with no separate interactive element required", async () => {
    const user = userEvent.setup();
    render(<ClientFaq />);
    await user.tab();
    expect(screen.getByText(CLIENT_FAQ[0]!.question).closest("summary")).toHaveFocus();
  });
});
