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

    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
  });

  it("clearly labels the experience as an AI-assisted guide, not a live chat", async () => {
    const user = userEvent.setup();
    render(<AssistantLauncher />);

    await user.click(screen.getByRole("button", { name: /ask about shahriyar/i }));

    expect(await screen.findByText(/ai-assisted portfolio guide|ai-assisted guide/i)).toBeInTheDocument();
  });
});
