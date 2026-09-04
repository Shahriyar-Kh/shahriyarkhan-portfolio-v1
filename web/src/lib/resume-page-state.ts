import type { ApiResult } from "@/lib/api/errors";
import type { Education, Experience, Project, ResumeVersion, Skill } from "@/lib/api/types";
import { RESUME_PDF_PATH } from "@/content/site";

export type ResumeSource = "default_version" | "composed_from_lists";

export interface ResumePageState {
  readonly source: ResumeSource;
  readonly summary: string | null;
  readonly experiences: readonly Experience[];
  readonly education: readonly Education[];
  readonly skills: readonly Skill[];
  readonly projects: readonly Project[];
  /** Always present - the static PDF never depends on the API. */
  readonly pdfHref: string;
  readonly usedFallback: boolean;
}

/**
 * Treats EVERY failure mode of getDefaultResume() identically - the
 * documented 404 ("No published default resume is configured."),
 * timeout, network, or not_configured - by falling back to composing the
 * view from the four list endpoints. Never notFound(), never
 * error.tsx: the page cannot structurally break, because the PDF
 * download is a bundled static asset independent of any API call.
 */
export function resolveResumePageState(
  resume: ApiResult<ResumeVersion>,
  experiences: ApiResult<Experience[]>,
  education: ApiResult<Education[]>,
  skills: ApiResult<Skill[]>,
  projects: ApiResult<Project[]>,
): ResumePageState {
  if (resume.ok) {
    return {
      source: "default_version",
      summary: resume.data.custom_summary || null,
      experiences: resume.data.experiences,
      education: resume.data.education,
      skills: resume.data.skills,
      projects: resume.data.projects,
      pdfHref: RESUME_PDF_PATH,
      usedFallback: false,
    };
  }

  return {
    source: "composed_from_lists",
    summary: null,
    experiences: experiences.ok ? experiences.data : [],
    education: education.ok ? education.data : [],
    skills: skills.ok ? skills.data : [],
    projects: projects.ok ? projects.data : [],
    pdfHref: RESUME_PDF_PATH,
    usedFallback: true,
  };
}
