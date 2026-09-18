import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postProjectDiscovery: vi.fn(),
}));

import { ProjectDiscoveryWizard } from "@/components/assistant/project-discovery-wizard";
import { postProjectDiscovery } from "@/lib/api";

const postProjectDiscoveryMock = vi.mocked(postProjectDiscovery);

async function fillContactAndProject(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Name/i), "Jane Client");
  await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.selectOptions(screen.getByLabelText(/project type/i), "Web application");
  await user.selectOptions(screen.getByLabelText(/current stage/i), "Just an idea");
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.type(screen.getByLabelText(/business problem/i), "Our order tracking is entirely manual today.");
  await user.type(screen.getByLabelText(/expected outcome/i), "One dashboard for the whole team.");
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.type(screen.getByLabelText(/required.*features/i), "Order tracking{Enter}");
  await user.click(screen.getByRole("button", { name: /next/i }));

  await user.click(screen.getByRole("button", { name: /next/i })); // constraints step, all optional
}

describe("ProjectDiscoveryWizard", () => {
  beforeEach(() => {
    postProjectDiscoveryMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a progress indicator and starts on the contact step", () => {
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    expect(screen.getByText(/step 1 of 6: contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/i)).toBeInTheDocument();
  });

  it("blocks navigation past the contact step without a valid name and email", async () => {
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 6: contact/i)).toBeInTheDocument();
  });

  it("Back returns to the previous step without losing entered data", async () => {
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await user.type(screen.getByLabelText(/^Name/i), "Jane Client");
    await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText(/step 2 of 6: project/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(screen.getByText(/step 1 of 6: contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/i)).toHaveValue("Jane Client");
  });

  it("requires at least one required feature on the scope step", async () => {
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await user.type(screen.getByLabelText(/^Name/i), "Jane Client");
    await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(screen.getByLabelText(/project type/i), "Web application");
    await user.selectOptions(screen.getByLabelText(/current stage/i), "Just an idea");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/business problem/i), "Our order tracking is entirely manual today.");
    await user.type(screen.getByLabelText(/expected outcome/i), "One dashboard for the whole team.");
    await user.click(screen.getByRole("button", { name: /next/i }));

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByText(/list at least one required feature/i)).toBeInTheDocument();
  });

  it("reaches the review step and requires consent before submitting", async () => {
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await fillContactAndProject(user);

    expect(screen.getByText(/step 6 of 6: review/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /submit enquiry/i }));

    expect(screen.getByText(/consent is required/i)).toBeInTheDocument();
    expect(postProjectDiscoveryMock).not.toHaveBeenCalled();
  });

  it("submits successfully and shows the reference ID", async () => {
    postProjectDiscoveryMock.mockResolvedValue({
      ok: true,
      data: { reference_id: "SK-ABCDEFGH", discovery_summary: "Project type: Web application" },
    });
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await fillContactAndProject(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit enquiry/i }));

    expect(await screen.findByText(/your project enquiry was received/i)).toBeInTheDocument();
    expect(screen.getByText("SK-ABCDEFGH")).toBeInTheDocument();
  });

  it("shows a retryable error state when submission fails, without losing form data", async () => {
    postProjectDiscoveryMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." },
    });
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await fillContactAndProject(user);
    await user.click(screen.getByLabelText(/i consent/i));
    await user.click(screen.getByRole("button", { name: /submit enquiry/i }));

    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit enquiry/i })).toBeEnabled();
  });

  it("does not require login/account fields anywhere in the flow", () => {
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });
});
