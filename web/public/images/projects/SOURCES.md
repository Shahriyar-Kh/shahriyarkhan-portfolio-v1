# Project screenshot provenance

Every image in this directory is either evidence media (a capture of the
project's documented public `live_url` or an owner-provided product
screenshot) or an explicitly labelled concept illustration. Generated
illustrations are never described as screenshots or project evidence.
Each asset was manually reviewed for personal/private data before being
committed. See
`src/test-guards/project-screenshot-provenance.test.ts` for the
mechanical guard that every file here has a matching entry below, and
`scripts/capture-project-screenshots.mjs` for how these were produced.

| File | Source URL | Source kind | Captured | Privacy check |
|---|---|---|---|---|
| nurses-beyond-borders-nclex-learning-platform.webp | https://nbb-lms.vercel.app/ | Owner-provided product screenshot | 2026-09-21 | Reviewed - authenticated learning dashboard with generic interface content only. No learner name, email, phone number, payment data, answer history, or other personal data is visible. Rendered as a static cover, never described as a public full-page capture. |
| yango-wing-fleet-digital-registration-fleet-management-platform.webp | https://yango-wing-fleet.vercel.app | Public capture | 2026-09-02 | Reviewed - public marketing/registration page. Cropped shorter than the live page's full length to deliberately exclude that page's own "real office, real people" section (photos of a physical premises) - business marketing photography, not customer data, but excluded out of caution given this project's documented privacy history (docs/rebuild/P01A5H_PRIVACY_HOTFIX_REPORT.md). No personal names, phone numbers, or admin/authenticated screens visible in the kept portion. |
| noteassist-ai-productivity-platform.webp | https://noteassistai.vercel.app | Public capture | 2026-09-02 | Reviewed - public marketing page. Contains only generic first-name+role testimonial attributions (standard product-marketing pattern) and the project's own public support email, already public elsewhere on this portfolio. No admin/authenticated screens, no other personal data. |
| sk-learntrack-ai-learning-platform.webp | https://sk-learntrack.vercel.app | Public capture | 2026-09-02 | Reviewed - public marketing page. No personal names, phone numbers, or admin/authenticated data visible. |
| feelwise-emotion-detection-system.webp | https://feelwise-emotion-detection.feelwise.workers.dev | Public capture | 2026-09-02 | Reviewed - public marketing page. Contains only generic first-name+role testimonial attributions (standard product-marketing pattern). No admin/authenticated screens, no other personal data. |
| shahriyar-khan-portfolio-platform.webp | https://shahriyarkhan.com | Public capture | 2026-09-21 | Reviewed - public portfolio pages only. No private admin, enquiry, assessment, analytics, or unpublished résumé content is visible. |
| techbuilt-open-school-operational-lms-concept.webp | Not applicable - generated concept | Concept illustration | 2026-09-21 | Generated for this portfolio with no readable text, numbers, scale claims, logos, people, or personal data. The UI always displays a visible “Concept illustration” label. |
| techbuilt-open-school-final-year-project-concept.webp | Not applicable - generated concept | Concept illustration | 2026-09-21 | Generated for this portfolio with no readable text, numbers, scale claims, logos, people, or personal data. The UI always displays a visible “Concept illustration” label. |
| advanced-restaurant-management-system-concept.webp | Not applicable - generated concept | Concept illustration | 2026-09-21 | Generated for this portfolio with no readable text, prices, metrics, logos, people, or personal data. The UI always displays a visible “Concept illustration” label. |

The generated covers above exist only to prevent visually empty project
cards where no safe public screenshot exists. They make no claim about
the shipped interface, scale, users, revenue, or outcomes.
