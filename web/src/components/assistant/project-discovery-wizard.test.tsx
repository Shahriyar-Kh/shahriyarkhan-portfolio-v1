import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postProjectDiscovery: vi.fn(),
  postProjectDiscoveryAnalysis: vi.fn(),
}));

import { ProjectDiscoveryWizard } from "@/components/assistant/project-discovery-wizard";
import { postProjectDiscovery, postProjectDiscoveryAnalysis } from "@/lib/api";

const postProjectDiscoveryMock = vi.mocked(postProjectDiscovery);
const postProjectDiscoveryAnalysisMock = vi.mocked(postProjectDiscoveryAnalysis);

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
    postProjectDiscoveryAnalysisMock.mockReset();
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
    expect(screen.getByRole("button", { name: /submit enquiry/i })).toBeDisabled();
    expect(postProjectDiscoveryMock).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(/i consent/i));
    expect(screen.getByRole("button", { name: /submit enquiry/i })).toBeEnabled();
  });

  it("shows every submitted section in the review summary", async () => {
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" />);

    await user.type(screen.getByLabelText(/^Name/i), "Jane Client");
    await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/Phone \/ WhatsApp/i), "+44 7000 000000");
    await user.type(screen.getByLabelText(/Organization/i), "Example Ltd");
    await user.selectOptions(screen.getByLabelText(/Preferred contact method/i), "whatsapp");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(screen.getByLabelText(/project type/i), "Web application");
    await user.selectOptions(screen.getByLabelText(/current stage/i), "Just an idea");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/business problem/i), "Bookings are currently managed in spreadsheets.");
    await user.type(screen.getByLabelText(/target users/i), "Staff and customers");
    await user.type(screen.getByLabelText(/expected outcome/i), "A reliable self-service booking flow.");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/required.*features/i), "Booking workflow{Enter}");
    await user.type(screen.getByLabelText(/optional features/i), "SMS reminders{Enter}");
    await user.type(screen.getByLabelText(/existing website/i), "Existing brand guide");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.selectOptions(screen.getByLabelText(/budget range/i), "$1,000 - $5,000");
    await user.selectOptions(screen.getByLabelText(/timeline/i), "1-3 months");
    await user.type(screen.getByLabelText(/technical preferences/i), "Django and PostgreSQL");
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.type(screen.getByLabelText(/additional notes/i), "Accessibility is important.");

    expect(screen.getByText("Jane Client")).toBeInTheDocument();
    expect(screen.getByText("+44 7000 000000")).toBeInTheDocument();
    expect(screen.getByText("Example Ltd")).toBeInTheDocument();
    expect(screen.getByText("Staff and customers")).toBeInTheDocument();
    expect(screen.getByText("SMS reminders")).toBeInTheDocument();
    expect(screen.getByText("Existing brand guide")).toBeInTheDocument();
    expect(screen.getByText("Django and PostgreSQL")).toBeInTheDocument();
    expect(screen.getAllByText("Accessibility is important.")).toHaveLength(2);
  }, 20_000);

  it("prefills a reviewable structured draft from project analysis", async () => {
    postProjectDiscoveryAnalysisMock.mockResolvedValue({
      ok: true,
      data: {
        summary: "A booking application for a small clinic.",
        project_type: "Web application",
        project_stage: "Just an idea",
        target_users: "Staff and Patients",
        expected_outcome: "Make booking and scheduling easier to manage.",
        required_features: ["Booking workflow", "Email reminders"],
        optional_features: [],
        technical_preferences: "Django, PostgreSQL",
        follow_up_questions: ["Do you have a target timeline or budget range?"],
        fallback_used: true,
      },
    });
    const user = userEvent.setup();
    render(<ProjectDiscoveryWizard sourcePage="/contact" initialDescription="I need a clinic booking web app for staff and patients." />);

    expect(await screen.findByText(/helpful questions to consider/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Name/i), "Jane Client");
    await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.getByLabelText(/project type/i)).toHaveValue("Web application");
    expect(screen.getByLabelText(/current stage/i)).toHaveValue("Just an idea");
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
