import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postAssistantQuery: vi.fn(),
}));

import { AssistantChat } from "@/components/assistant/assistant-chat";
import { postAssistantQuery } from "@/lib/api";

const postAssistantQueryMock = vi.mocked(postAssistantQuery);

function projectResponse() {
  return {
    ok: true as const,
    data: {
      answer: "Based on the published portfolio: Yango Wing Fleet - a fleet management platform.",
      intent: "PROJECTS" as const,
      sources: [{ source_id: "project:yango-wing-fleet", type: "project", title: "Yango Wing Fleet", public_path: "/work/yango-wing-fleet" }],
      recommended_projects: ["yango-wing-fleet"],
      recommended_services: [],
      handoff: { active: false, reason: null },
      remaining_requests: 39,
    },
  };
}

describe("AssistantChat", () => {
  beforeEach(() => {
    postAssistantQueryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows starter questions before any turn is sent", () => {
    render(<AssistantChat onStartProject={vi.fn()} />);

    expect(screen.getByText(/what does shahriyar specialize in\?/i)).toBeInTheDocument();
  });

  it("clicking a starter question sends it and renders a grounded project recommendation", async () => {
    postAssistantQueryMock.mockResolvedValue(projectResponse());
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    await user.click(screen.getByText(/show me relevant django projects\./i));

    expect(await screen.findByText(/yango wing fleet - a fleet management platform/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view case study/i })).toHaveAttribute("href", "/work/yango-wing-fleet");
    expect(screen.getByRole("button", { name: /ask about this project/i })).toBeInTheDocument();
  });

  it("asks a grounded follow-up when the visitor chooses Ask about this project", async () => {
    postAssistantQueryMock
      .mockResolvedValueOnce(projectResponse())
      .mockResolvedValueOnce({
        ok: true,
        data: {
          answer: "Yango Wing Fleet is a published portfolio project.",
          intent: "PROJECTS",
          sources: [{ source_id: "project:yango-wing-fleet", type: "project", title: "Yango Wing Fleet", public_path: "/work/yango-wing-fleet" }],
          recommended_projects: ["yango-wing-fleet"],
          recommended_services: [],
          handoff: { active: false, reason: null },
          remaining_requests: 38,
        },
      });
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    await user.click(screen.getByText(/show me relevant django projects\./i));
    await user.click(await screen.findByRole("button", { name: /ask about this project/i }));

    await waitFor(() => expect(postAssistantQueryMock).toHaveBeenCalledTimes(2));
    expect(postAssistantQueryMock.mock.calls[1]?.[0].message).toMatch(/tell me more about the yango wing fleet project/i);
  });

  it("renders recommended services as real service links", async () => {
    postAssistantQueryMock.mockResolvedValue({
      ok: true,
      data: {
        answer: "A relevant published service is Full-Stack Web Development.",
        intent: "SERVICES",
        sources: [{ source_id: "service:full-stack-web-development", type: "service", title: "Full-Stack Web Development", public_path: "/services/full-stack-web-development" }],
        recommended_projects: [],
        recommended_services: ["full-stack-web-development"],
        handoff: { active: false, reason: null },
        remaining_requests: 39,
      },
    });
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    const textbox = screen.getByRole("textbox", { name: /ask a question/i });
    await user.type(textbox, "What services are relevant?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByRole("link", { name: /full-stack web development/i })).toHaveAttribute("href", "/services/full-stack-web-development");
  });

  it("renders the insufficient-evidence state distinctly, without inventing a source", async () => {
    postAssistantQueryMock.mockResolvedValue({
      ok: true,
      data: {
        answer: "The published portfolio information doesn't verify an answer to that.",
        intent: "INSUFFICIENT_EVIDENCE",
        sources: [],
        recommended_projects: [],
        recommended_services: [],
        handoff: { active: true, reason: "insufficient_evidence" },
        remaining_requests: 38,
      },
    });
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    const textbox = screen.getByRole("textbox", { name: /ask a question/i });
    await user.type(textbox, "Has he worked with Rust?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByText(/doesn't verify an answer/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /contact shahriyar/i })).toHaveAttribute("href", "/contact");
  });

  it("a CLIENT_QUESTION handoff triggers the start-a-project callback", async () => {
    postAssistantQueryMock.mockResolvedValue({
      ok: true,
      data: {
        answer: "For a project request like this, start a project enquiry.",
        intent: "CLIENT_QUESTION",
        sources: [],
        recommended_projects: [],
        recommended_services: [],
        handoff: { active: true, reason: "project_discovery" },
        remaining_requests: 37,
      },
    });
    const onStartProject = vi.fn();
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={onStartProject} />);

    const textbox = screen.getByRole("textbox", { name: /ask a question/i });
    await user.type(textbox, "Can you build me a website?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    await screen.findByText(/start a project enquiry/i);
    await user.click(screen.getByRole("button", { name: /^start a project$/i }));

    expect(onStartProject).toHaveBeenCalledTimes(1);
  });

  it("shows a provider/network fallback error state on a failed request", async () => {
    postAssistantQueryMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." },
    });
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    const textbox = screen.getByRole("textbox", { name: /ask a question/i });
    await user.type(textbox, "What does Shahriyar specialize in?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/temporarily unavailable/i);
  });

  it("renders the quota/rate-limit error state safely", async () => {
    postAssistantQueryMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 429, message: "Too many attempts. Please try again shortly." },
    });
    const user = userEvent.setup();
    render(<AssistantChat onStartProject={vi.fn()} />);

    const textbox = screen.getByRole("textbox", { name: /ask a question/i });
    await user.type(textbox, "What are his skills?");
    await user.click(screen.getByRole("button", { name: /^ask$/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many attempts/i);
  });

  it("does not auto-send a message without explicit user action", () => {
    render(<AssistantChat onStartProject={vi.fn()} />);

    expect(postAssistantQueryMock).not.toHaveBeenCalled();
  });

  it("never leaks a secret or environment-looking value in the rendered answer", async () => {
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
    const user = userEvent.setup();
    const { container } = render(<AssistantChat onStartProject={vi.fn()} />);

    await user.click(screen.getByText(/what does shahriyar specialize in\?/i));
    await waitFor(() => expect(postAssistantQueryMock).toHaveBeenCalled());

    expect(container.innerHTML).not.toMatch(/gemini_api_key|api[_-]?key/i);
  });
});
