/**
 * FINAL-DESIGN-01A-R6: frontend-only presentation layer for the homepage
 * Services section - image mapping plus expanded (but still scannable)
 * positioning copy, keyed by the seven real service slugs the API
 * returns. Nothing here touches backend data; every field is either (a)
 * the real API's own title/description/deliverables (read directly from
 * the `Service` object in services-capability.tsx, not duplicated here)
 * or (b) new frontend copy built only from the capability vocabulary the
 * owner approved for each service - never a price, timeline, guarantee,
 * client count, or completed-project claim.
 *
 * `bestFor` describes who the *offering* is for - it is never evidence
 * that a completed project exists. Real completed-project evidence lives
 * only in `content/services.ts`'s `SERVICE_FRAMING` (audience lines
 * backed by real `relatedProjectSlugs`) and in the Project Proof
 * Timeline / Featured Case sections - deliberately kept separate so this
 * file can never blur "what I offer" with "what I've shipped."
 */
export interface ServiceImage {
  /** Path under /public, e.g. "/images/services/website-development.webp". */
  file: string;
  alt: string;
  /** "owned" = a real screenshot of Shahriyar's own project/portfolio
   * (eligible for the hover/focus vertical auto-pan). "illustrative" =
   * a licensed stock photograph representing the service concept, never
   * proof of a completed project (scale/focal treatment only, never
   * panned). */
  kind: "owned" | "illustrative";
  /** Real intrinsic pixel dimensions of the optimized file - required
   * for "owned" images only. `service-media.tsx` renders these at their
   * natural size (not `fill`) inside a shorter fixed-height window, the
   * same technique `work/project-screenshots.ts`/`project-frame.tsx`
   * already use, because the auto-pan measurement needs the image's own
   * rendered height to genuinely overflow its window - a `fill` image's
   * box always exactly matches its container, so there would be nothing
   * to measure. */
  width?: number;
  height?: number;
}

export interface ServiceMediaEntry {
  image: ServiceImage;
  bestFor: string;
  scope: string;
  /** Only technologies confirmed present in the real, live Skills API -
   * never invented for a service that doesn't genuinely use them. */
  techTags: readonly string[];
}

export const SERVICES_MEDIA: Readonly<Record<string, ServiceMediaEntry>> = {
  "website-development": {
    image: {
      file: "/images/services/website-development.webp",
      alt: "SK-LearnTrack, a real responsive website Shahriyar built and deployed",
      kind: "owned",
      width: 1280,
      height: 3553,
    },
    bestFor: "Best for teams and individuals who need a fast, responsive site built and deployed properly - not just handed off.",
    scope:
      "Responsive interfaces built with accessibility fundamentals and SEO in mind, wired to whatever API or content source the project needs. Delivered with real deployment support, not a zip file.",
    techTags: ["React.js", "JavaScript", "Vercel"],
  },
  "restaurant-website": {
    image: {
      file: "/images/services/restaurant-website.webp",
      alt: "A digital restaurant menu open on a tablet",
      kind: "illustrative",
    },
    bestFor: "Best for restaurants and cafés that want a real menu, reservations, and ordering online - not a static flyer site.",
    scope:
      "Menu presentation and a reservation or inquiry flow built mobile-first, since most diners browse on a phone. Content stays manageable after launch, not locked behind a developer.",
    techTags: ["React.js", "JavaScript"],
  },
  "ecommerce-website": {
    image: {
      file: "/images/services/ecommerce-website.webp",
      alt: "A laptop screen reading 'online shopping' beside gift boxes and a small shopping cart",
      kind: "illustrative",
    },
    bestFor: "Best for businesses ready to sell online with a real product catalogue and checkout - not a marketplace listing.",
    scope:
      "Product catalogue, cart, and checkout built on real payment integration, with an inventory and admin workflow behind it. Built to be run day-to-day, not just launched once.",
    techTags: ["Django/DRF", "React.js", "PostgreSQL"],
  },
  "saas-project": {
    image: {
      file: "/images/services/saas-project.webp",
      alt: "NoteAssist AI, a real SaaS product dashboard Shahriyar built",
      kind: "owned",
      width: 1280,
      height: 4833,
    },
    bestFor: "Best for founders building a multi-user product with accounts, dashboards, and ongoing usage.",
    scope:
      "Authentication and role-based dashboards backed by REST APIs, on a PostgreSQL/Redis-backed architecture built to scale. Structured to support subscription billing when that's part of the project's scope.",
    techTags: ["Django/DRF", "PostgreSQL", "React.js"],
  },
  "portfolio-website": {
    image: {
      file: "/images/services/portfolio-website.webp",
      alt: "This portfolio itself, an example of the case-study-driven sites Shahriyar builds",
      kind: "owned",
      width: 1280,
      height: 5300,
    },
    bestFor: "Best for professionals and freelancers who want a personal brand site that actually converts recruiters or clients.",
    scope:
      "Case-study storytelling and responsive design built around real, verifiable work, with SEO fundamentals and a clear recruiter/client conversion path. The same evidence-first approach this site itself uses.",
    techTags: ["React.js", "JavaScript"],
  },
  "backend-development": {
    image: {
      file: "/images/services/backend-development.webp",
      alt: "A close-up of real backend code in an editor",
      kind: "illustrative",
    },
    bestFor: "Best for teams that need an API or backend that holds up under real use, not a prototype.",
    scope:
      "REST APIs built with Django, DRF, or FastAPI, with JWT-based authentication and role-based permissions on top of a real PostgreSQL data model. Caching and background work added where the project actually needs it.",
    techTags: ["Django/DRF", "FastAPI", "PostgreSQL", "Python"],
  },
  "custom-web-application": {
    image: {
      file: "/images/services/custom-web-application.webp",
      alt: "Yango Wing Fleet, a real business workflow application Shahriyar built",
      kind: "owned",
      width: 1280,
      height: 3420,
    },
    bestFor: "Best for businesses whose actual workflow doesn't fit an off-the-shelf tool.",
    scope:
      "Administration dashboards, reporting, and integrations built around the specific roles and process a business already has. Scoped to the real workflow, not a generic template.",
    techTags: ["Django/DRF", "React.js", "PostgreSQL"],
  },
} as const;
