import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postContact: vi.fn(),
  postServiceRequest: vi.fn(),
}));

import { InquiryForm } from "@/components/contact/inquiry-form";
import { postContact } from "@/lib/api";

const postContactMock = vi.mocked(postContact);

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Name/i), "Jane Doe");
  await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
  await user.type(screen.getByLabelText(/^Subject/i), "A general inquiry");
  await user.type(screen.getByLabelText(/^Message/i), "This message is definitely more than twenty characters long.");
}

describe("InquiryForm - contact success/failure", () => {
  beforeEach(() => {
    postContactMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a success notice, phrased as backend acceptance not email delivery, on a 2xx response", async () => {
    postContactMock.mockResolvedValue({
      ok: true,
      data: {
        id: 1,
        sender_name: "Jane Doe",
        email: "jane@example.com",
        subject: "A general inquiry",
        service_type_text: "",
        message: "m",
        status: "new",
        admin_notes: "",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    });

    const user = userEvent.setup();
    render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
    expect(screen.getByText(/does not guarantee an email notification/i)).toBeInTheDocument();
  });

  it("shows the API's error message and never a fake success on failure", async () => {
    postContactMock.mockResolvedValue({
      ok: false,
      error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." },
    });

    const user = userEvent.setup();
    render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(screen.getByText("The content service is temporarily unavailable.")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/was received/i)).not.toBeInTheDocument();
  });

  it("blocks submission client-side and never calls the API for an invalid form", async () => {
    const user = userEvent.setup();
    render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(postContactMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
  });

  it("silently reports success without calling the API when the honeypot field is filled", async () => {
    const user = userEvent.setup();
    render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

    await fillRequiredFields(user);
    await user.type(screen.getByLabelText("Website"), "http://spam.example");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
    expect(postContactMock).not.toHaveBeenCalled();
  });
});
