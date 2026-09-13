import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function freshInquiries() {
  vi.resetModules();
  return import("@/lib/api/inquiries");
}

describe("postContact / postServiceRequest", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("postContact posts to the contact endpoint and returns only the reference id on success", async () => {
    const created = { reference_id: "SK-ABCDEFGH" };
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify(created), { status: 201 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { postContact } = await freshInquiries();

    const result = await postContact({ sender_name: "Jane", email: "j@example.com", subject: "s", message: "m" });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.example.test/api/v1/public/inquiries/contact/");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.reference_id).toBe("SK-ABCDEFGH");
  });

  it("postContact treats a 200 (idempotent replay of a repeated submission_id) as success too", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ reference_id: "SK-ABCDEFGH" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { postContact } = await freshInquiries();

    const result = await postContact({
      sender_name: "Jane",
      email: "j@example.com",
      subject: "s",
      message: "m",
      submission_id: "11111111-1111-1111-1111-111111111111",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.reference_id).toBe("SK-ABCDEFGH");
  });

  it("postContact surfaces a validation error (400 field map) success being distinct from acceptance", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ email: ["Enter a valid email address."] }), { status: 400 })));
    const { postContact } = await freshInquiries();

    const result = await postContact({ sender_name: "Jane", email: "bad", subject: "s", message: "m" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("validation");
  });

  it("postServiceRequest posts to the service-requests endpoint", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { postServiceRequest } = await freshInquiries();

    await postServiceRequest({ sender_name: "Jane", email: "j@example.com", subject: "s", message: "m", source_page: "/contact" });

    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.example.test/api/v1/public/inquiries/service-requests/");
  });
});
