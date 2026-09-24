import type { ApiResult } from "@/lib/api/errors";
import type {
  Certification,
  Education,
  Experience,
  Project,
  ResumeDocumentLine,
  ResumeDocumentSection,
  ResumeVersion,
  SiteSettings,
  Skill,
} from "@/lib/api/types";
import { CONTACT_FALLBACKS, OWNER_NAME, SOCIAL_LINKS } from "@/content/site";

export type ResumeSource = "default_version" | "composed_from_lists";

/** Matches ResumeDraftForm's fixed master-résumé title (backend
 * admin_forms.py) - used only in the no-published-master fallback
 * state, so the page still shows a real, non-invented professional
 * title instead of a blank heading. */
const PROFESSIONAL_TITLE_FALLBACK = "Software Engineer | Backend Engineer | Python/Django Full-Stack Developer";

export interface ResumeContactLink {
  readonly label: string;
  readonly href: string;
}

export interface ResumeDownloadState {
  readonly pdf: boolean;
  readonly docx: boolean;
}

/**
 * A published default master exists: every rendered fact comes from the
 * immutable snapshot's `document` DTO (B7-RC correction 1) - never from
 * live SiteSetting or live portfolio rows, so a later edit to any of
 * those can never change what this state describes.
 */
export interface PublishedResumePageState {
  readonly source: "default_version";
  readonly usedFallback: false;
  readonly name: string;
  readonly professionalTitle: string;
  readonly contacts: readonly ResumeDocumentLine[];
  readonly sections: readonly ResumeDocumentSection[];
  readonly downloads: ResumeDownloadState;
}

/**
 * No valid published default master exists (or its snapshot could not
 * be normalized) - the only state allowed to read live SiteSetting/
 * portfolio data, and always rendered with a visible "not an approved
 * generated résumé" notice so it can never be mistaken for one.
 */
export interface FallbackResumePageState {
  readonly source: "composed_from_lists";
  readonly usedFallback: true;
  readonly name: string;
  readonly professionalTitle: string;
  readonly contactEmail: string;
  readonly contactLocation: string | null;
  readonly contactLinks: readonly ResumeContactLink[];
  readonly summary: string | null;
  readonly skills: readonly Skill[];
  readonly experiences: readonly Experience[];
  readonly projects: readonly Project[];
  readonly education: readonly Education[];
  readonly certifications: readonly Certification[];
  readonly downloads: ResumeDownloadState;
}

export type ResumePageState = PublishedResumePageState | FallbackResumePageState;

function contactLinks(siteSettings: SiteSettings | null): ResumeContactLink[] {
  const links: ResumeContactLink[] = [];
  const github = siteSettings?.social_links?.github || SOCIAL_LINKS.github;
  const linkedin = siteSettings?.social_links?.linkedin || SOCIAL_LINKS.linkedin;
  if (github) links.push({ label: "GitHub", href: github });
  if (linkedin) links.push({ label: "LinkedIn", href: linkedin });
  return links;
}

/**
 * B7-RC correction 1: when a valid published default master exists, its
 * `document` DTO (built server-side only from the immutable snapshot -
 * see build_public_resume_document) is the ONLY source used. Live
 * SiteSetting/portfolio data is used exclusively for the no-published-
 * master fallback, composed from the public list endpoints - the same
 * graceful-degrade convention as ContactView - and is always reported
 * with `usedFallback: true` so it can never be presented as the
 * approved résumé. A résumé fetch that documented-404s, times out, or
 * hits a network/not_configured error is treated identically to "no
 * document" and falls into this same fallback branch.
 */
export function resolveResumePageState(
  resume: ApiResult<ResumeVersion>,
  siteSettings: ApiResult<SiteSettings>,
  experiences: ApiResult<Experience[]>,
  education: ApiResult<Education[]>,
  skills: ApiResult<Skill[]>,
  projects: ApiResult<Project[]>,
): ResumePageState {
  if (resume.ok && resume.data.document) {
    const document = resume.data.document;
    return {
      source: "default_version",
      usedFallback: false,
      name: document.name,
      professionalTitle: document.professional_title,
      contacts: document.contacts,
      sections: document.sections,
      downloads: {
        pdf: resume.data.downloads?.pdf?.available ?? false,
        docx: resume.data.downloads?.docx?.available ?? false,
      },
    };
  }

  const settings = siteSettings.ok ? siteSettings.data : null;
  return {
    source: "composed_from_lists",
    usedFallback: true,
    name: settings?.owner_name || OWNER_NAME,
    professionalTitle: PROFESSIONAL_TITLE_FALLBACK,
    contactEmail: settings?.public_email || CONTACT_FALLBACKS.email,
    contactLocation: settings?.public_location || CONTACT_FALLBACKS.location || null,
    contactLinks: contactLinks(settings),
    summary: null,
    skills: skills.ok ? skills.data : [],
    experiences: experiences.ok ? experiences.data : [],
    projects: projects.ok ? projects.data : [],
    education: education.ok ? education.data : [],
    certifications: [],
    downloads: { pdf: false, docx: false },
  };
}
