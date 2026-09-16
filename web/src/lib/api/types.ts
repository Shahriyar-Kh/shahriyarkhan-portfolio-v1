/**
 * The full backend data contract, verified by direct code reading against
 * origin/main @ 2539accdff31368557d35725f9e70866d414ea37 - see
 * docs/rebuild/P01_ARCHITECTURE.md for how this was verified.
 *
 * Deliberately absent, and a reviewer should reject any PR that adds
 * them: short_description, feature_bullets, images, ProjectImage,
 * detail_images. Two separate attempts to add a gallery feature to the
 * Project model were merged and reverted after production incidents;
 * the backend has none of these fields today.
 */

/** DRF PageNumberPagination envelope. PAGE_SIZE = 12. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type PublishStatus = "draft" | "published";

export interface Technology {
  id: number;
  name: string;
  slug: string;
}

export interface SkillCategory {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type SkillLevel = 1 | 2 | 3 | 4;

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  1: "Beginner",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};

export interface Skill {
  id: number;
  name: string;
  description: string; // blank=True -> "" never null
  level: SkillLevel; // raw int; render via SKILL_LEVEL_LABELS, never as a percentage
  icon_or_badge: string; // "" when unset
  category: SkillCategory; // full nested object; FK is non-null (PROTECT), so never null
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  slug: string;
  description: string;
  technologies: Technology[];
  live_url: string; // URLField(blank=True) -> "" when unset, NEVER null
  github_url: string; // same
  preview_image: string | null; // absolute media URL, or null
  featured_image: string | null; // absolute media URL, or null
  alt_text: string;
  ai_summary: string;
  featured: boolean;
  status: PublishStatus; // always "published" on the public endpoint
  published_at: string | null;
  display_order: number;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  image_alt_text: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fields that DO NOT EXIST on the backend today. docs/rebuild/
 * P01_BACKEND_EVOLUTION_PLAN.md records them as a documented future gap.
 * Declared here ONLY so ProjectCaseSections can light up automatically
 * if the backend ever sends them. Never defaulted, never fabricated,
 * never given placeholder text.
 */
export interface ProjectCaseStudyFields {
  overview: string;
  problem: string;
  solution: string;
  outcome: string;
  challenge: string;
  development_highlights: string[];
}

/** What /work/[slug] consumes. The extra keys are always undefined today. */
export type ProjectWithOptionalCaseStudy = Project & Partial<ProjectCaseStudyFields>;

export interface Experience {
  id: number;
  company_name: string;
  role_title: string;
  start_date: string; // "YYYY-MM-DD"
  end_date: string | null;
  location: string; // "" when unset
  description: string;
  achievements: string[]; // JSONField(default=list)
  technologies: Technology[];
  current_role: boolean;
  status: PublishStatus; // NOTE: this model has NO published_at field
  display_order: number;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  image_alt_text: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  title: string;
  slug: string;
  description: string;
  deliverables: string[]; // JSONField(default=list)
  featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  display_order: number;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_title: string;
  og_description: string;
  image_alt_text: string;
  created_at: string;
  updated_at: string;
}

export interface Education {
  id: number;
  institution: string;
  degree: string;
  start_date: string;
  end_date: string | null;
  description: string; // "" when unset
  status: PublishStatus;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  // NOTE: Education does NOT inherit SEOMetadataModel - no seo_*/og_* fields.
}

export interface SiteSettings {
  id: number;
  site_name: string;
  owner_name: string;
  public_email: string; // EmailField(blank=True) -> "" when unset
  public_phone: string;
  public_location: string;
  notification_email: string;
  hero_title: string;
  hero_subtitle: string;
  default_seo_title: string;
  default_seo_description: string;
  default_keywords: string;
  footer_text: string;
  social_links: Record<string, string>; // JSONField(default=dict); shape NOT schema-enforced
  maintenance_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface PageSeo {
  id: number;
  page_key: string;
  slug: string;
  title_tag: string;
  meta_description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  image_alt_text: string;
  canonical_url: string;
  ai_suggested_title: string; // never rendered publicly in this phase
  ai_suggested_description: string; // never rendered publicly in this phase
  created_at: string;
  updated_at: string;
  // Every PageSEO row is live - this model has no draft/published concept.
}

export interface Certification {
  id: number;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  credential_id: string;
  credential_url: string; // "" when unset
  description: string;
  is_verified: boolean;
  status: PublishStatus;
  published_at: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/** Whether this format is really downloadable right now - resolved by
 * the same authoritative policy (resolve_downloadable_export) the
 * download endpoint itself uses, so this can never say `true` for an
 * export the download route would 404 on, or vice versa. Never the
 * bytes or a hash. Actual bytes are served only by the stable
 * /default/download/<format>/ backend route. */
export interface ResumeDownloadAvailability {
  available: boolean;
}

/** One safe, pre-validated (http/https only) contiguous run of a
 * snapshot text line - a plain segment (href: null) or a clickable one.
 * Identical segmentation to what the PDF/DOCX renderers embed as real
 * links (services.exports.security.split_text_and_links). */
export interface ResumeDocumentLinkSegment {
  text: string;
  href: string | null;
}

/** A single rendered line (a contact line, or one bullet/paragraph
 * inside a section) as an ordered run of segments - join their `text`
 * to get the plain-text line; render each with an `href` as a link. */
export type ResumeDocumentLine = ResumeDocumentLinkSegment[];

export interface ResumeDocumentSection {
  key: string;
  heading: string;
  items: ResumeDocumentLine[];
}

/**
 * The safe public presentation DTO for a résumé (B7-RC correction 1) -
 * built exclusively from the B6 shared normalized document, itself
 * derived only from the immutable, approved resume_content/source_facts
 * snapshot. NEVER built from live SiteSetting or live portfolio rows,
 * so it is guaranteed to be exactly what was approved/published/
 * exported - the only field the frontend should render a published
 * résumé from. `null` only if the snapshot could not be normalized (a
 * state a valid published master should never reach).
 */
export interface ResumeDocument {
  name: string;
  professional_title: string;
  contacts: ResumeDocumentLine[];
  sections: ResumeDocumentSection[];
}

export interface ResumeVersion {
  id: number;
  title: string;
  slug: string;
  target_role: string;
  custom_summary: string;
  is_default: boolean;
  ats_tags: string;
  /** LIVE-sourced (the current M2M selections), kept only for
   * response-shape compatibility. Can legitimately drift from what was
   * actually approved/published/exported - never render a published
   * résumé from these. Use `document` instead. */
  projects: Project[]; // serializer source="include_projects"
  experiences: Experience[]; // source="include_experiences"
  skills: Skill[]; // source="include_skills"
  education: Education[]; // source="include_education"
  certifications: Certification[]; // source="include_certifications"
  document: ResumeDocument | null;
  downloads: {
    pdf: ResumeDownloadAvailability;
    docx: ResumeDownloadAvailability;
  };
}

// ---- Inquiry write payloads (request bodies) ----

export interface ContactMessagePayload {
  sender_name: string; // required, max_length 150
  email: string; // required
  subject: string; // required, max_length 200
  message: string; // required
  service_type_text?: string; // optional, max_length 255
  intent?: string; // optional - one of CONTACT_INTENTS' values (content/contact.ts)
  source_page?: string; // optional - must match a real site route or the backend rejects it
  submission_id?: string; // optional client-generated UUID - a retried submit with the
  // same value returns the original reference_id instead of creating a duplicate row
  website?: string; // honeypot - always empty for a real visitor, never read back
}

export interface ServiceRequestPayload {
  sender_name: string; // required, max_length 150
  email: string; // required
  subject: string; // required, max_length 200
  message: string; // required
  service?: number | null; // optional plain FK id (NOT nested)
  service_type_text?: string; // optional, max_length 255
  budget_range?: string; // optional, max_length 120
  timeline?: string; // optional, max_length 120
  source_page?: string; // optional, max_length 200 - must match a real site route
  intent?: string; // optional - one of CONTACT_INTENTS' values (content/contact.ts)
  submission_id?: string; // optional client-generated UUID - see ContactMessagePayload
  website?: string; // honeypot - see ContactMessagePayload
}

// ---- Inquiry 201/200 response ----
// The backend deliberately returns ONLY this - never the internal DB id,
// never delivery/internal error detail (CONTACT-OPS-01, Phase 7). A 200
// means an idempotent replay of an already-accepted submission_id; the
// shape is identical either way.
export interface InquiryReceipt {
  reference_id: string;
}

// ---- Portfolio assistant (PORTFOLIO-ASSISTANTS-01) ----

/** Mirrors apps.assistant.services.schema.INTENTS exactly. */
export type AssistantIntent =
  | "PORTFOLIO_OVERVIEW"
  | "SKILLS"
  | "EXPERIENCE"
  | "PROJECTS"
  | "PROJECT_RECOMMENDATION"
  | "SERVICES"
  | "RECRUITER_QUESTION"
  | "HIRING_AVAILABILITY_HANDOFF"
  | "CLIENT_QUESTION"
  | "CONTACT_HANDOFF"
  | "OFF_TOPIC"
  | "INSUFFICIENT_EVIDENCE";

export interface AssistantSource {
  source_id: string;
  type: string;
  title: string;
  public_path: string | null;
}

export interface AssistantHandoff {
  active: boolean;
  reason: string | null;
}

export interface AssistantQueryPayload {
  message: string;
  session_id?: string | null;
}

export interface AssistantQueryResponse {
  answer: string;
  intent: AssistantIntent;
  sources: AssistantSource[];
  recommended_projects: string[];
  recommended_services: string[];
  handoff: AssistantHandoff;
  remaining_requests: number;
  fallback_used?: boolean;
}

// ---- Client Project Discovery (PORTFOLIO-ASSISTANTS-01 section 12-14) ----

export interface ProjectDiscoveryPayload {
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  preferred_contact_method?: "email" | "phone" | "whatsapp" | "";
  project_type: string;
  project_stage: string;
  business_problem: string;
  target_users?: string;
  expected_outcome: string;
  required_features: string[];
  optional_features?: string[];
  existing_assets?: string;
  budget_range?: string;
  timeline?: string;
  technical_preferences?: string;
  additional_notes?: string;
  consent_given: boolean;
  source_page?: string;
  intent?: string;
  submission_id?: string;
  website?: string;
}

export interface ProjectDiscoveryReceipt {
  reference_id: string;
  discovery_summary: string;
}
