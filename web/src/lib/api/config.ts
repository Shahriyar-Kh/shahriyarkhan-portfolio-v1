export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
export const IS_API_CONFIGURED = API_BASE_URL.length > 0;
/** A Render free-tier instance's cold start alone has been measured at
 * ~22s (FINAL-DESIGN-01A-R6-FIX). The previous 10s value, combined with
 * a single 400ms-backoff retry (~20.4s total budget), was measurably
 * shorter than a real cold start - this is the confirmed root cause of
 * R6's homepage rendering every dataset as "temporarily unavailable". */
export const DEFAULT_TIMEOUT_MS = 20_000;
/** Bounded backoff schedule for `retry: true` GET requests - applies
 * only to network/timeout-classified failures (never a 4xx, validation,
 * or schema error - see client.ts's apiGet). Two retries (three attempts
 * total) comfortably clears a single Render cold start with margin. */
export const RETRY_BACKOFF_MS = [1_000, 4_000] as const;

/** Seconds. Chosen by how often each resource actually changes. */
export const REVALIDATE = {
  projects: 300, // 5 min - most likely to change (a project gets published/edited)
  experiences: 1800, // 30 min
  services: 1800, // 30 min
  skills: 3600, // 1 h
  education: 3600, // 1 h
  siteSettings: 3600, // 1 h
  pageSeo: 3600, // 1 h
  resume: 3600, // 1 h
} as const;

/** Emitted as next.tags now so a future on-demand revalidate route needs
 * no client-site change - see docs/rebuild/P01_BACKEND_EVOLUTION_PLAN.md. */
export const CACHE_TAGS = {
  projects: "projects",
  experiences: "experiences",
  services: "services",
  skills: "skills",
  education: "education",
  siteSettings: "site-settings",
  pageSeo: "page-seo",
  resume: "resume",
} as const;
