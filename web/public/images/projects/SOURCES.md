# Project screenshot provenance

Every file in this directory is a full-page capture of the project's own
documented, public `live_url` - never a third-party site, never anything
behind a login. Each was manually reviewed for personal/private data
before being committed. See
`src/test-guards/project-screenshot-provenance.test.ts` for the
mechanical guard that every file here has a matching entry below, and
`scripts/capture-project-screenshots.mjs` for how these were produced.

| File | Source URL | Captured | Privacy check |
|---|---|---|---|
| yango-wing-fleet-digital-registration-fleet-management-platform.webp | https://yango-wing-fleet.vercel.app | 2026-09-02 | Reviewed - public marketing/registration page. Cropped shorter than the live page's full length to deliberately exclude that page's own "real office, real people" section (photos of a physical premises) - business marketing photography, not customer data, but excluded out of caution given this project's documented privacy history (docs/rebuild/P01A5H_PRIVACY_HOTFIX_REPORT.md). No personal names, phone numbers, or admin/authenticated screens visible in the kept portion. |
| noteassist-ai-productivity-platform.webp | https://noteassistai.vercel.app | 2026-09-02 | Reviewed - public marketing page. Contains only generic first-name+role testimonial attributions (standard product-marketing pattern) and the project's own public support email, already public elsewhere on this portfolio. No admin/authenticated screens, no other personal data. |
| sk-learntrack-ai-learning-platform.webp | https://sk-learntrack.vercel.app | 2026-09-02 | Reviewed - public marketing page. No personal names, phone numbers, or admin/authenticated data visible. |
| feelwise-emotion-detection-system.webp | https://feelwise-emotion-detection.feelwise.workers.dev | 2026-09-02 | Reviewed - public marketing page. Contains only generic first-name+role testimonial attributions (standard product-marketing pattern). No admin/authenticated screens, no other personal data. |

Advanced Restaurant Management System and TechBuilt Open School (TBOS)
have no entry here and no auto-pan on the homepage: neither has a public
`live_url` to safely capture from (see `lib/api/types.ts`'s `Project`
type and the live API response) - both continue to use their existing
verified API image, or the honest SkMark typographic tile, unchanged.
