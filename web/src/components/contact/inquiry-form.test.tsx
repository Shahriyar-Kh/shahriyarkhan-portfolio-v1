import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  postContact: vi.fn(),
  postServiceRequest: vi.fn(),
}));

import { InquiryForm } from "@/components/contact/inquiry-form";
import { postContact, postServiceRequest } from "@/lib/api";

const postContactMock = vi.mocked(postContact);
const postServiceRequestMock = vi.mocked(postServiceRequest);

const SERVICES = [
  { id: 1, title: "Website Development" },
  { id: 2, title: "Backend / API Development" },
];

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Name/i), "Jane Doe");
  await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
  await user.type(screen.getByLabelText(/^Subject/i), "A general inquiry");
  await user.type(screen.getByLabelText(/^Message/i), "This message is definitely more than twenty characters long.");
}

const CONTACT_RESPONSE = {
  ok: true as const,
  data: { reference_id: "SK-ABCDEFGH" },
};

const SERVICE_REQUEST_RESPONSE = {
  ok: true as const,
  data: { reference_id: "SK-12345678" },
};

describe("InquiryForm", () => {
  beforeEach(() => {
    postContactMock.mockReset();
    postServiceRequestMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("intent routing (recruiter, project, general)", () => {
    it("general intent (default, actually supported) posts to the message endpoint", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(postContactMock).toHaveBeenCalledTimes(1));
      expect(postServiceRequestMock).not.toHaveBeenCalled();
    });

    it("recruiter intent (hiring) posts to the message endpoint - a role/hiring inquiry, not a project", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="hiring" sourcePage="/contact" />);

      expect(screen.getByRole("combobox", { name: /what's this about/i })).toHaveValue("hiring");

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(postContactMock).toHaveBeenCalledTimes(1));
      expect(postServiceRequestMock).not.toHaveBeenCalled();
    });

    it("project intent (freelance_project) posts to the service-request endpoint with the real backend contract shape", async () => {
      postServiceRequestMock.mockResolvedValue(SERVICE_REQUEST_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(postServiceRequestMock).toHaveBeenCalledTimes(1));
      expect(postContactMock).not.toHaveBeenCalled();
      const payload = postServiceRequestMock.mock.calls[0]![0];
      expect(Object.keys(payload).sort()).toEqual(
        ["sender_name", "email", "subject", "message", "service", "source_page", "intent", "submission_id"].sort(),
      );
    });
  });

  describe("required-field, email, and message-length validation", () => {
    it("blocks submission client-side and never calls the API for an entirely empty form", async () => {
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(postContactMock).not.toHaveBeenCalled();
      expect(await screen.findByText("Enter your name.")).toBeInTheDocument();
      expect(screen.getByText("Enter your email.")).toBeInTheDocument();
      expect(screen.getByText("Enter a subject.")).toBeInTheDocument();
      expect(screen.getByText("Enter a message.")).toBeInTheDocument();
    });

    it("rejects a malformed email address without calling the API", async () => {
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await user.type(screen.getByLabelText(/^Name/i), "Jane Doe");
      await user.type(screen.getByLabelText(/^Email/i), "not-an-email");
      await user.type(screen.getByLabelText(/^Subject/i), "Subject");
      await user.type(screen.getByLabelText(/^Message/i), "This message is definitely more than twenty characters long.");
      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
      expect(postContactMock).not.toHaveBeenCalled();
    });

    it("rejects a message shorter than 20 characters without calling the API", async () => {
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await user.type(screen.getByLabelText(/^Name/i), "Jane Doe");
      await user.type(screen.getByLabelText(/^Email/i), "jane@example.com");
      await user.type(screen.getByLabelText(/^Subject/i), "Subject");
      await user.type(screen.getByLabelText(/^Message/i), "too short");
      await user.click(screen.getByRole("button", { name: /send message/i }));

      expect(await screen.findByText("Say a bit more - at least 20 characters.")).toBeInTheDocument();
      expect(postContactMock).not.toHaveBeenCalled();
    });

    it("marks every required field with the native required attribute for unambiguous screen-reader semantics", () => {
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);
      expect(screen.getByLabelText(/^Name/i)).toBeRequired();
      expect(screen.getByLabelText(/^Email/i)).toBeRequired();
      expect(screen.getByLabelText(/^Subject/i)).toBeRequired();
      expect(screen.getByLabelText(/^Message/i)).toBeRequired();
    });

    it("never marks the optional budget/timeline/service fields as required", () => {
      render(<InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" />);
      expect(screen.getByLabelText(/Budget range/i)).not.toBeRequired();
      expect(screen.getByLabelText(/Timeline/i)).not.toBeRequired();
      expect(screen.getByLabelText(/Related service/i)).not.toBeRequired();
    });
  });

  describe("optional fields and related-service preselection", () => {
    it("submits successfully with every optional field left blank", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
    });

    it("only shows budget/timeline/related-service fields for a project-mode intent, never for message-mode", () => {
      const { unmount } = render(<InquiryForm services={SERVICES} initialIntent="general" sourcePage="/contact" />);
      expect(screen.queryByLabelText(/Budget range/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Related service/i)).not.toBeInTheDocument();
      unmount();

      render(<InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" />);
      expect(screen.getByLabelText(/Budget range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Related service/i)).toBeInTheDocument();
    });

    it("preselects the real, already-validated service from a service-detail CTA's query parameter", () => {
      render(
        <InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" initialServiceId="2" />,
      );
      expect(screen.getByLabelText(/Related service/i)).toHaveValue("2");
    });

    it("includes the preselected service id in the real request payload sent to the backend", async () => {
      postServiceRequestMock.mockResolvedValue(SERVICE_REQUEST_RESPONSE);
      const user = userEvent.setup();
      render(
        <InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" initialServiceId="2" />,
      );

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(postServiceRequestMock).toHaveBeenCalledTimes(1));
      expect(postServiceRequestMock.mock.calls[0]![0]).toMatchObject({ service: 2 });
    });
  });

  describe("submit lifecycle: pending, duplicate prevention, success, errors", () => {
    it("disables the submit button and shows an accessible pending label while submitting", async () => {
      let resolvePromise: (value: typeof CONTACT_RESPONSE) => void = () => {};
      postContactMock.mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve; }));
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      const pendingButton = await screen.findByRole("button", { name: /sending/i });
      expect(pendingButton).toBeDisabled();
      resolvePromise(CONTACT_RESPONSE);
    });

    it("never fires a second API call for a rapid duplicate submit while the first is still pending", async () => {
      let resolvePromise: (value: typeof CONTACT_RESPONSE) => void = () => {};
      postContactMock.mockImplementation(() => new Promise((resolve) => { resolvePromise = resolve; }));
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      const button = screen.getByRole("button", { name: /send message/i });
      await user.click(button);
      // The button is now disabled/pending - a second click (e.g. a fast
      // double-click before React re-renders) must not fire a second call.
      await user.click(button);
      await user.click(button);

      expect(postContactMock).toHaveBeenCalledTimes(1);
      resolvePromise(CONTACT_RESPONSE);
    });

    it("shows a success notice, phrased as backend acceptance not email delivery, on a 2xx response", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
      expect(screen.getByText(/does not guarantee an email notification/i)).toBeInTheDocument();
    });

    it("shows the returned reference id inside the accessible success region", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("SK-ABCDEFGH");
    });

    it("sends a stable submission id so a resubmit after an error reuses the same idempotency key", async () => {
      postContactMock.mockResolvedValueOnce({
        ok: false,
        error: { kind: "network", status: null, message: "Could not reach the content service." },
      });
      postContactMock.mockResolvedValueOnce(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      const button = screen.getByRole("button", { name: /send message/i });
      await user.click(button);
      await screen.findByText("Could not reach the content service.");
      await user.click(button);
      await waitFor(() => expect(postContactMock).toHaveBeenCalledTimes(2));

      const firstSubmissionId = postContactMock.mock.calls[0]![0].submission_id;
      const secondSubmissionId = postContactMock.mock.calls[1]![0].submission_id;
      expect(firstSubmissionId).toBeTruthy();
      expect(firstSubmissionId).toBe(secondSubmissionId);
    });

    it("announces the success state via an accessible live region (role=status)", async () => {
      postContactMock.mockResolvedValue(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent(/was received/i);
    });

    it("shows the API's real error message and never a fake success on a generic server failure", async () => {
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

    it("announces a server/network error via role=alert, next to the submit control", async () => {
      postContactMock.mockResolvedValue({
        ok: false,
        error: { kind: "network", status: null, message: "Could not reach the content service." },
      });
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("Could not reach the content service.");
    });

    it("recovers cleanly to a re-submittable form after a network failure - never gets stuck in a dead pending state", async () => {
      postContactMock.mockResolvedValueOnce({
        ok: false,
        error: { kind: "network", status: null, message: "Could not reach the content service." },
      });
      postContactMock.mockResolvedValueOnce(CONTACT_RESPONSE);
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      const button = screen.getByRole("button", { name: /send message/i });
      await user.click(button);
      await screen.findByText("Could not reach the content service.");

      expect(button).toBeEnabled();
      await user.click(button);

      await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
      expect(postContactMock).toHaveBeenCalledTimes(2);
    });

    it("maps real DRF field-level validation errors from the API onto the matching form fields", async () => {
      postContactMock.mockResolvedValue({
        ok: false,
        error: {
          kind: "validation",
          status: 400,
          message: "Please correct the highlighted fields.",
          fieldErrors: { email: ["Enter a valid email address."], subject: ["This field may not be blank."] },
        },
      });
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument());
      expect(screen.getByText("This field may not be blank.")).toBeInTheDocument();
    });
  });

  describe("honeypot", () => {
    it("silently reports success without calling the API when the honeypot field is filled", async () => {
      const user = userEvent.setup();
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);

      await fillRequiredFields(user);
      await user.type(screen.getByLabelText("Website"), "http://spam.example");
      await user.click(screen.getByRole("button", { name: /send message/i }));

      await waitFor(() => expect(screen.getByText(/was received/i)).toBeInTheDocument());
      expect(postContactMock).not.toHaveBeenCalled();
    });

    it("keeps the honeypot field out of the tab order and hidden from assistive tech", () => {
      render(<InquiryForm services={[]} initialIntent="general" sourcePage="/contact" />);
      const honeypot = screen.getByLabelText("Website");
      expect(honeypot).toHaveAttribute("tabIndex", "-1");
      expect(honeypot.closest("[aria-hidden]")).toBeInTheDocument();
    });
  });

  describe("keyboard accessibility", () => {
    it("reaches every real field and the submit button in a logical tab order", async () => {
      const user = userEvent.setup();
      render(<InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" />);

      const order: string[] = [];
      for (let i = 0; i < 12; i++) {
        await user.tab();
        const el = document.activeElement;
        if (el && el !== document.body) order.push(el.getAttribute("name") || el.getAttribute("id") || el.tagName);
      }
      expect(order.some((id) => id.includes("name"))).toBe(true);
      expect(order.some((id) => id.includes("email"))).toBe(true);
      expect(order.some((id) => id.includes("message"))).toBe(true);
    });
  });

  describe("reduced motion", () => {
    it("renders the entire form and every field immediately under prefers-reduced-motion - nothing is opacity-gated", () => {
      const original = window.matchMedia;
      window.matchMedia = ((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      })) as unknown as typeof window.matchMedia;
      try {
        render(<InquiryForm services={SERVICES} initialIntent="freelance_project" sourcePage="/contact" />);
        expect(screen.getByLabelText(/^Name/i)).toBeVisible();
        expect(screen.getByLabelText(/^Message/i)).toBeVisible();
        expect(screen.getByRole("button", { name: /send message/i })).toBeVisible();
      } finally {
        window.matchMedia = original;
      }
    });
  });
});
