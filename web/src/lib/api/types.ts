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

export interface ResumeVersion {
  id: number;
  title: string;
  slug: string;
  target_role: string;
  custom_summary: string;
  is_default: boolean;
  ats_tags: string;
  projects: Project[]; // serializer source="include_projects"
  experiences: Experience[]; // source="include_experiences"
  skills: Skill[]; // source="include_skills"
  education: Education[]; // source="include_education"
}

// ---- Inquiry write payloads (request bodies) ----

export interface ContactMessagePayload {
  sender_name: string; // required, max_length 150
  email: string; // required
  subject: string; // required, max_length 200
  message: string; // required
  service_type_text?: string; // optional, max_length 255
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
  source_page?: string; // optional, max_length 200
}

// ---- Inquiry 201 responses (fields="__all__", so read-only fields are echoed) ----

export interface ContactMessage {
  id: number;
  sender_name: string;
  email: string;
  subject: string;
  service_type_text: string;
  message: string;
  status: "new" | "read" | "replied" | "archived";
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRequest {
  id: number;
  sender_name: string;
  email: string;
  service: number | null;
  service_type_text: string;
  subject: string;
  message: string;
  budget_range: string;
  timeline: string;
  source_page: string;
  status: "new" | "in_progress" | "closed";
  admin_notes: string;
  created_at: string;
  updated_at: string;
}
