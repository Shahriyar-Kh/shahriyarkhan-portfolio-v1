import { describe, expect, it } from "vitest";
import { resolveServicePageState } from "@/lib/service-page-state";
import type { Service } from "@/lib/api/types";

const SERVICE = { id: 1, slug: "s", title: "S" } as Service;

describe("resolveServicePageState", () => {
  it("resolves ready for a successful fetch", () => {
    expect(resolveServicePageState({ ok: true, data: SERVICE })).toEqual({ kind: "ready", service: SERVICE });
  });

  it("resolves not_found for a 404 (the local find-by-slug miss)", () => {
    expect(
      resolveServicePageState({ ok: false, error: { kind: "not_found", status: 404, message: "Service not found." } }),
    ).toEqual({ kind: "not_found" });
  });

  it("resolves unavailable for a transient failure", () => {
    const result = resolveServicePageState({
      ok: false,
      error: { kind: "network", status: null, message: "Could not reach the content service." },
    });
    expect(result.kind).toBe("unavailable");
  });
});
