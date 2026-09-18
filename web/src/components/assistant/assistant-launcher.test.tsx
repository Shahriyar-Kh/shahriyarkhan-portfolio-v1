import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postAssistantQuery: vi.fn(),
  postProjectDiscovery: vi.fn(),
}));

import { AssistantLauncher } from "@/components/assistant/assistant-launcher";
import { postAssistantQuery } from "@/lib/api";

const postAssistantQueryMock = vi.mocked(postAssistantQuery);

describe("AssistantLauncher", () => {
  beforeEach(() => {
    postAssistantQueryMock.mockReset();
    postAssistantQueryMock.mockResolvedValue({
      ok: true,
      data: {
        answer: "He specializes in Python and Django backend engineering.",
        intent: "PORTFOLIO_OVERVIEW",
        sources: [],
        recommended_projects: [],
        recommended_services: [],
        handoff: { active: false, reason: null },
        remaining_requests: 39,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a discoverable launcher button that is closed by default", () => {
    render(<AssistantLauncher />);

    expect(screen.getByRole("button", { name: /ask about shahriyar/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the dialog with both entry paths on click", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Ask about Shahriyar" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Start a project" })).toBeInTheDocument();
  });

  it("is keyboard-operable: Escape closes the open dialog", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("the close button closes the dialog", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /close/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("switches to the Start a project tab", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Start a project" }));

    expect(await screen.findByLabelText(/^Name/i)).toBeInTheDocument();
  });

  it("clearly labels the experience as an AI-assisted guide, not a live chat", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));

    expect(await screen.findByText(/ai-assisted portfolio guide|ai-assisted guide/i)).toBeInTheDocument();
  });

  // PORTFOLIO-ASSISTANTS-02: regression coverage for the confirmed visual
  // defect (the launcher disappeared on mobile/tablet and never
  // recovered, even back at a working desktop width). Root cause: the
  // ENTIRE launcher, trigger button included, was gated behind
  // `next/dynamic(..., { ssr: false })` with no loading fallback - if
  // that chunk ever failed or stalled to load, the always-visible button
  // silently rendered nothing and never retried. The fix moves the lazy
  // `dynamic()` boundary to only the heavy interior panels (AssistantChat,
  // ProjectDiscoveryWizard), which are rendered only after the visitor
  // opens the dialog - the trigger button itself is now a plain,
  // synchronously-rendered element with no async/chunk-loading gap at all.
  describe("launcher availability (PA-02 regression)", () => {
    it("the trigger button is present synchronously on the very first render - not gated behind any async/lazy loader", () => {
      render(<AssistantLauncher />);

      // Deliberately getByRole, not findByRole/await: if the button were
      // ever put back behind a dynamic()/Suspense boundary, it would not
      // exist in the DOM on this first synchronous assertion and this
      // test would fail immediately, catching the exact regression class.
      expect(screen.getByRole("button", { name: /ask about shahriyar/i })).toBeInTheDocument();
    });

    it("the trigger button's own classes never hide it responsively (no hidden/sm:hidden/md:hidden/lg:hidden tokens)", () => {
      render(<AssistantLauncher />);

      const button = screen.getByRole("button", { name: /ask about shahriyar/i });
      const classes = button.className.split(/\s+/);
      expect(classes.some((c) => /(^|:)hidden$/.test(c))).toBe(false);
    });

    it("closing the assistant chat leaves the launcher button in the document", async () => {
      const user = userEvent.setup();
      render(<AssistantLauncher />);

      await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: /close/i }));

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByRole("button", { name: /ask about shahriyar/i })).toBeInTheDocument();
    });

    it("closing project discovery (via Escape) leaves the launcher button in the document", async () => {
      const user = userEvent.setup();
      render(<AssistantLauncher />);

      await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Start a project" }));
      await screen.findByLabelText(/^Name/i);

      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.getByRole("button", { name: /ask about shahriyar/i })).toBeInTheDocument();
    });

    it("the trigger button can never exceed the viewport width, regardless of label length", () => {
      // ASSISTANT-LAUNCHER-FIX: a hard safety net (max-w + overflow-hidden
      // + whitespace-nowrap) so the button's own content can never be the
      // reason it renders off-screen on a narrow viewport - independent
      // of whichever label text is actually visible at a given breakpoint.
      render(<AssistantLauncher />);
      const trigger = screen.getAllByRole("button", { name: /ask/i }).find((btn) => btn.getAttribute("aria-haspopup") === "dialog")!;
      expect(trigger.className).toMatch(/max-w-\[calc\(100vw-/);
      expect(trigger.className).toContain("overflow-hidden");
      expect(trigger.className).toContain("whitespace-nowrap");
    });

    it("carries both a compact mobile label and the full desktop label, switched by a responsive class only", () => {
      // Both spans exist in markup at all times (real CSS media queries,
      // not JS, decide which renders) - this asserts the structure exists,
      // not that a narrow viewport is actually simulated (jsdom does not
      // evaluate CSS @media rules) - see ASSISTANT-LAUNCHER-FIX report for
      // the manual/real-browser verification this still requires.
      render(<AssistantLauncher />);
      const trigger = screen.getAllByRole("button", { name: /ask/i }).find((btn) => btn.getAttribute("aria-haspopup") === "dialog")!;
      const compact = trigger.querySelector(".sm\\:hidden");
      const full = trigger.querySelector(".sm\\:inline");
      expect(compact).toHaveTextContent("Ask");
      expect(full).toHaveTextContent("Ask about Shahriyar");
    });

    it("switching between Ask and Start a project and back leaves the launcher trigger present throughout", async () => {
      // Once the dialog is open, both the persistent trigger and the
      // dialog's own "Ask about Shahriyar" tab button match the same
      // accessible name - the trigger is the one that opens/closes the
      // dialog (aria-haspopup="dialog"), so that's what distinguishes it.
      const getTrigger = () =>
        screen.getAllByRole("button", { name: /ask about shahriyar/i }).find((btn) => btn.getAttribute("aria-haspopup") === "dialog");

      const user = userEvent.setup();
      render(<AssistantLauncher />);

      await user.click(getTrigger()!);
      await screen.findByRole("dialog");
      expect(getTrigger()).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Start a project" }));
      await screen.findByLabelText(/^Name/i);
      expect(getTrigger()).toBeInTheDocument();

      const dialog = screen.getByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Ask about Shahriyar" }));
      expect(getTrigger()).toBeInTheDocument();
    });
  });
});
