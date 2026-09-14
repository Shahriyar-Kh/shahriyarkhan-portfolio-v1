export interface RouteMetadataDefault {
  /** The PageSEO page_key this route checks for enhancement data. A
   * missing/unseeded key is expected and falls back to this default
   * silently - see lib/api/seo.ts. */
  pageKey: string;
  title: string;
  description: string;
  keywords?: string;
}

/**
 * Every route in this object has a solid, hand-written default - PageSEO
 * is strictly an enhancement layer on top, never a requirement. Title
 * kept <=60 chars, description 120-160 chars (checked in
 * lib/metadata.test.ts) - a real, mechanical SEO gate.
 */
export const ROUTE_METADATA_DEFAULTS: Record<string, RouteMetadataDefault> = {
  home: {
    pageKey: "home",
    title: "Shahriyar Khan — Software Engineer",
    description:
      "Python and Django engineering for REST APIs, authenticated business platforms, and deployed web products. Based in Islamabad, Pakistan.",
    keywords: "Shahriyar Khan software engineer, Shahriyar Khan Python developer, Shahriyar Khan Django developer",
  },
  about: {
    pageKey: "about",
    title: "About",
    description:
      "Shahriyar Khan is a software engineer specializing in Python, Django, and full-stack application delivery, based in Islamabad, Pakistan.",
    keywords: "Shahriyar Khan about, backend developer Islamabad, Python developer Pakistan",
  },
  skills: {
    pageKey: "skills",
    title: "Skills",
    description:
      "Technologies and skill categories across backend, frontend, database, tools, and deployment, with honest categorical proficiency levels.",
    keywords: "Shahriyar Khan skills, Python developer skills, Django developer technologies",
  },
  work: {
    pageKey: "work",
    title: "Selected Work",
    description:
      "A selection of REST API and full-stack systems built with Django REST Framework, React, and PostgreSQL, each with a verified live URL or repository.",
    keywords: "Django developer portfolio, Python developer projects, Django REST API projects",
  },
  experience: {
    pageKey: "experience",
    title: "Experience",
    description:
      "The structured employment record behind the case studies on this site - roles, companies, dates, and the technologies used in each one.",
    keywords: "Shahriyar Khan experience, Django developer experience, Python developer work history",
  },
  resume: {
    pageKey: "resume",
    title: "Résumé",
    description:
      "Shahriyar Khan resume - experience, education, and core technical skills, with a direct PDF download and no unverifiable claims.",
    keywords: "Shahriyar Khan resume, Shahriyar Khan CV, Django developer resume",
  },
  services: {
    pageKey: "services",
    title: "Services",
    description:
      "Backend engineering, REST API development, and full-stack web applications built with Django, DRF, React, and PostgreSQL.",
    keywords: "Django developer for hire, hire Python backend developer, Django REST API development services",
  },
  contact: {
    pageKey: "contact",
    title: "Contact",
    description:
      "Get in touch about a role, a freelance project, or backend and full-stack development work - a message goes directly to a single-person inbox.",
    keywords: "contact Shahriyar Khan, hire Django developer",
  },
  privacy: {
    pageKey: "privacy",
    title: "Privacy",
    description:
      "What this website collects through its contact and project forms, where it goes, and this site's approach to tracking, spam prevention, and data retention.",
  },
};
