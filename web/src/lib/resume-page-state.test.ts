import { describe, expect, it } from "vitest";
import { resolveResumePageState } from "@/lib/resume-page-state";
import { CONTACT_FALLBACKS, OWNER_NAME, SOCIAL_LINKS } from "@/content/site";
import type { ApiResult } from "@/lib/api/errors";
import type { Education, Experience, Project, ResumeDocument, ResumeVersion, SiteSettings, Skill } from "@/lib/api/types";

const EMPTY_LIST_OK = <T>(): ApiResult<T[]> => ({ ok: true, data: [] });
const SITE_SETTINGS_NOT_FOUND: ApiResult<SiteSettings> = { ok: false, error: { kind: "network", status: null, message: "unreachable" } };

const SITE_SETTINGS_OK: ApiResult<SiteSettings> = {
  ok: true,
  data: {
    id: 1,
    site_name: "Shahriyar Portfolio",
    owner_name: "Real Owner Name",
    public_email: "real@example.invalid",
    public_phone: "",
    public_location: "Real City",
    notification_email: "",
    hero_title: "",
    hero_subtitle: "",
    default_seo_title: "",
    default_seo_description: "",
    default_keywords: "",
    footer_text: "",
    social_links: { github: "https://github.example.invalid/real", linkedin: "https://linkedin.example.invalid/real" },
    maintenance_mode: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
};

const SNAPSHOT_DOCUMENT: ResumeDocument = {
  name: "Snapshot Owner Name",
  professional_title: "Software Engineer | Python & Django Full-Stack Developer",
  contacts: [[{ text: "snapshot@example.invalid", href: null }]],
  sections: [
    { key: "summary", heading: "PROFESSIONAL SUMMARY", items: [[{ text: "A frozen approved summary.", href: null }]] },
    { key: "skills", heading: "SKILLS", items: [[{ text: "Python, Django", href: null }]] },
  ],
};

function resumeOk(overrides: Partial<ResumeVersion> = {}): ApiResult<ResumeVersion> {
  return {
    ok: true,
    data: {
      id: 1,
      title: "Software Engineer | Python & Django Full-Stack Developer",
      slug: "default",
      target_role: "",
      custom_summary: "Legacy live summary - must never be used when document is present.",
      is_default: true,
      projects: [],
      experiences: [],
      skills: [],
      education: [],
      certifications: [],
      document: SNAPSHOT_DOCUMENT,
      downloads: { pdf: { available: true }, docx: { available: false } },
      ...overrides,
    },
  };
}

describe("resolveResumePageState", () => {
  it("uses the published snapshot document when the fetch succeeds and a document is present", () => {
    const state = resolveResumePageState(
      resumeOk(),
      SITE_SETTINGS_OK,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );

    expect(state.source).toBe("default_version");
    expect(state.usedFallback).toBe(false);
    if (state.usedFallback) throw new Error("unreachable");
    expect(state.name).toBe("Snapshot Owner Name");
    expect(state.professionalTitle).toBe("Software Engineer | Python & Django Full-Stack Developer");
    expect(state.sections).toEqual(SNAPSHOT_DOCUMENT.sections);
    expect(state.contacts).toEqual(SNAPSHOT_DOCUMENT.contacts);
  });

  it("never reads name/title/summary from SiteSetting or the legacy live-sourced fields when a document is present", () => {
    const state = resolveResumePageState(
      resumeOk(),
      SITE_SETTINGS_OK,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );
    if (state.usedFallback) throw new Error("unreachable");
    // SITE_SETTINGS_OK's "Real Owner Name" must NOT leak in - only the
    // snapshot document's "Snapshot Owner Name" is used.
    expect(state.name).not.toBe("Real Owner Name");
    expect(JSON.stringify(state)).not.toContain("Real Owner Name");
    expect(JSON.stringify(state)).not.toContain("Legacy live summary");
  });

  it("exposes download availability exactly as reported by the API, per format", () => {
    const state = resolveResumePageState(
      resumeOk({ downloads: { pdf: { available: true }, docx: { available: false } } }),
      SITE_SETTINGS_OK,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );
    expect(state.downloads.pdf).toBe(true);
    expect(state.downloads.docx).toBe(false);
  });

  it("falls back to composing from lists when the résumé is ok but its document is null", () => {
    const state = resolveResumePageState(
      resumeOk({ document: null }),
      SITE_SETTINGS_OK,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );
    expect(state.source).toBe("composed_from_lists");
    expect(state.usedFallback).toBe(true);
    if (!state.usedFallback) throw new Error("unreachable");
    expect(state.name).toBe("Real Owner Name");
    expect(state.downloads).toEqual({ pdf: false, docx: false });
  });

  it("prefers live SiteSetting name/contact fields over the fallback constants in the fallback state", () => {
    const state = resolveResumePageState(
      { ok: false, error: { kind: "not_found", status: 404, message: "No published default resume is configured." } },
      SITE_SETTINGS_OK,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );
    if (!state.usedFallback) throw new Error("unreachable");
    expect(state.name).toBe("Real Owner Name");
    expect(state.contactEmail).toBe("real@example.invalid");
    expect(state.contactLocation).toBe("Real City");
    expect(state.contactLinks).toEqual([
      { label: "GitHub", href: "https://github.example.invalid/real" },
      { label: "LinkedIn", href: "https://linkedin.example.invalid/real" },
    ]);
  });

  it("falls back to the site constants when SiteSetting is also unavailable", () => {
    const state = resolveResumePageState(
      { ok: false, error: { kind: "timeout", status: null, message: "Took too long." } },
      SITE_SETTINGS_NOT_FOUND,
      EMPTY_LIST_OK<Experience>(),
      EMPTY_LIST_OK<Education>(),
      EMPTY_LIST_OK<Skill>(),
      EMPTY_LIST_OK<Project>(),
    );
    if (!state.usedFallback) throw new Error("unreachable");
    expect(state.name).toBe(OWNER_NAME);
    expect(state.contactEmail).toBe(CONTACT_FALLBACKS.email);
    expect(state.contactLinks).toEqual([
      { label: "GitHub", href: SOCIAL_LINKS.github },
      { label: "LinkedIn", href: SOCIAL_LINKS.linkedin },
    ]);
  });

  it("treats the documented 404 identically to a timeout: falls back to composing from lists, with downloads unavailable", () => {
    const notFound: ApiResult<ResumeVersion> = { ok: false, error: { kind: "not_found", status: 404, message: "No published default resume is configured." } };
    const timeout: ApiResult<ResumeVersion> = { ok: false, error: { kind: "timeout", status: null, message: "Took too long." } };

    for (const resume of [notFound, timeout]) {
      const state = resolveResumePageState(
        resume,
        SITE_SETTINGS_OK,
        EMPTY_LIST_OK<Experience>(),
        EMPTY_LIST_OK<Education>(),
        EMPTY_LIST_OK<Skill>(),
        EMPTY_LIST_OK<Project>(),
      );
      expect(state.source).toBe("composed_from_lists");
      expect(state.usedFallback).toBe(true);
      if (!state.usedFallback) throw new Error("unreachable");
      expect(state.downloads).toEqual({ pdf: false, docx: false });
      expect(state.certifications).toEqual([]);
      expect(state.summary).toBeNull();
      // Name/contact still resolve independently of the résumé fetch.
      expect(state.name).toBe("Real Owner Name");
    }
  });

  it("never invents a professional title, summary, or downloadable artifact when every API call fails", () => {
    const failure = { ok: false, error: { kind: "not_configured", status: null, message: "not configured" } } as const;
    const state = resolveResumePageState(failure, failure, failure, failure, failure, failure);
    if (!state.usedFallback) throw new Error("unreachable");
    expect(state.summary).toBeNull();
    expect(state.downloads).toEqual({ pdf: false, docx: false });
    expect(state.certifications).toEqual([]);
    expect(state.name).toBe(OWNER_NAME);
  });
});
