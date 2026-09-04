import { describe, expect, it } from "vitest";
import { resolveProjectPageState } from "@/lib/project-page-state";
import type { Project } from "@/lib/api/types";

const PROJECT = { id: 1, slug: "p", title: "P" } as Project;

describe("resolveProjectPageState", () => {
  it("resolves ready for a successful fetch", () => {
    expect(resolveProjectPageState({ ok: true, data: PROJECT })).toEqual({ kind: "ready", project: PROJECT });
  });

  it("resolves not_found ONLY for a genuine 404 - never for a timeout", () => {
    expect(
      resolveProjectPageState({ ok: false, error: { kind: "not_found", status: 404, message: "Not found." } }),
    ).toEqual({ kind: "not_found" });

    expect(
      resolveProjectPageState({
        ok: false,
        error: { kind: "timeout", status: null, message: "Took too long." },
      }),
    ).toEqual({ kind: "unavailable", message: "Took too long." });
  });

  it("resolves unavailable for a 5xx, never a false 404", () => {
    const result = resolveProjectPageState({
      ok: false,
      error: { kind: "http", status: 500, message: "The content service is temporarily unavailable." },
    });
    expect(result.kind).toBe("unavailable");
  });
});
