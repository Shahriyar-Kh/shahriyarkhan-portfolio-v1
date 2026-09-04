import { describe, expect, it } from "vitest";
import { resolveResumePageState } from "@/lib/resume-page-state";
import { RESUME_PDF_PATH } from "@/content/site";
import type { ApiResult } from "@/lib/api/errors";
import type { Education, Experience, Project, ResumeVersion, Skill } from "@/lib/api/types";

const EMPTY_LIST_OK = <T>(): ApiResult<T[]> => ({ ok: true, data: [] });

describe("resolveResumePageState", () => {
  it("uses the default resume version when the fetch succeeds", () => {
    const resume: ApiResult<ResumeVersion> = {
      ok: true,
      data: {
        id: 1,
        title: "Default",
        slug: "default",
        target_role: "",
        custom_summary: "A summary.",
        is_default: true,
        ats_tags: "",
        projects: [],
        experiences: [],
        skills: [],
        education: [],
      },
    };

    const state = resolveResumePageState(resume, EMPTY_LIST_OK<Experience>(), EMPTY_LIST_OK<Education>(), EMPTY_LIST_OK<Skill>(), EMPTY_LIST_OK<Project>());

    expect(state.source).toBe("default_version");
    expect(state.usedFallback).toBe(false);
    expect(state.summary).toBe("A summary.");
  });

  it("treats the documented 404 identically to a timeout: falls back to composing from lists", () => {
    const notFound: ApiResult<ResumeVersion> = { ok: false, error: { kind: "not_found", status: 404, message: "No published default resume is configured." } };
    const timeout: ApiResult<ResumeVersion> = { ok: false, error: { kind: "timeout", status: null, message: "Took too long." } };

    for (const resume of [notFound, timeout]) {
      const state = resolveResumePageState(resume, EMPTY_LIST_OK<Experience>(), EMPTY_LIST_OK<Education>(), EMPTY_LIST_OK<Skill>(), EMPTY_LIST_OK<Project>());
      expect(state.source).toBe("composed_from_lists");
      expect(state.usedFallback).toBe(true);
    }
  });

  it("always returns the static PDF href, even when every API call fails", () => {
    const failure = { ok: false, error: { kind: "not_configured", status: null, message: "not configured" } } as const;
    const state = resolveResumePageState(failure, failure, failure, failure, failure);
    expect(state.pdfHref).toBe(RESUME_PDF_PATH);
  });
});
