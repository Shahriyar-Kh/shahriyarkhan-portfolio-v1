# Service image provenance

Every file in this directory is either (a) a real screenshot of Shahriyar's
own public project or portfolio, or (b) a commercially-usable licensed
photograph used as illustrative service media only - never proof of a
completed project it doesn't represent. See
`src/components/sections/services-capability.test.tsx`'s "SERVICES_MEDIA
data integrity" suite for the mechanical guard that every service slug
maps to a local file, every mapped file exists on disk, and every
illustrative entry below is cross-referenced against this file, and
`src/content/services-media.ts` for the mapping/classification consumed
by `services-capability.tsx`.

## Owned-work evidence (real screenshots)

| Slug | File | Source URL | Captured | Notes |
|---|---|---|---|---|
| website-development | website-development.webp (1280×3553) | https://sk-learntrack.vercel.app | 2026-09-02 | Byte-identical copy of the already-privacy-reviewed `public/images/projects/sk-learntrack-ai-learning-platform.webp` (see that directory's own SOURCES.md for the original capture/review record). Reused rather than re-captured so there is exactly one reviewed source of truth per screenshot. Genuinely tall (full public marketing page), so the card's hover/focus auto-pan has real content to reveal. Presented as an example of a responsive site Shahriyar built, not a literal "Website Development service" client. |
| saas-project | saas-project.webp (1280×4833) | https://noteassistai.vercel.app | 2026-09-02 | Byte-identical copy of `public/images/projects/noteassist-ai-productivity-platform.webp` - same reuse rationale as above. Strongest real SaaS product/dashboard-style presentation of the two AI-learning projects (feature grid, stat cards, "Get Started Free"). |
| custom-web-application | custom-web-application.webp (1280×3420) | https://yango-wing-fleet.vercel.app | 2026-09-02 | Byte-identical copy of `public/images/projects/yango-wing-fleet-digital-registration-fleet-management-platform.webp` (already deliberately cropped shorter than the live page to exclude its "real office, real people" section - see that file's own provenance record). A real business workflow application (driver registration + fleet onboarding), matching "Custom Web Application" better than a generic marketing site. |
| portfolio-website | portfolio-website.webp (1280×5300) | This portfolio itself, `http://localhost:3299/` (local production build) | 2026-09-03 | Fresh capture (1280px viewport, scrolled through to settle every reveal) of Hero through Featured Case - deliberately stopped before the Services section itself to avoid an odd self-referential crop. Owned work, not a third party. Card uses the same restrained vertical auto-pan on hover/focus as the other three owned screenshots. |

## Illustrative licensed photography

None of these three depict a real Shahriyar client or completed project.
Every service card below draws its "Best for"/scope/deliverables text only
from real, owner-authored service data - the photograph is atmosphere, not
evidence.

| Slug | File | Photographer | Platform | Source URL | License |
|---|---|---|---|---|---|
| restaurant-website | restaurant-website.webp | Andrea Davis | Pexels | https://www.pexels.com/photo/menu-on-tablet-computer-10660199/ | Pexels License - https://www.pexels.com/license/ (free to use, no attribution required; credited here anyway) |
| ecommerce-website | ecommerce-website.webp | Nataliya Vaitkevich | Pexels | https://www.pexels.com/photo/laptop-with-online-shopping-website-and-boxes-nearby-6214474/ | Pexels License - https://www.pexels.com/license/ |
| backend-development | backend-development.webp | Luis Gomes | Pexels | https://www.pexels.com/photo/close-up-of-a-computer-screen-displaying-programming-code-in-a-dark-environment-546819/ | Pexels License - https://www.pexels.com/license/ |

Downloaded 2026-09-03 via Pexels' direct CDN (`images.pexels.com`), at
1600px width, `auto=compress&cs=tinysrgb` (Pexels' own delivery
compression). No Unsplash image was ultimately selected - candidates were
reviewed (see below) but either carried real recognizable retailer
branding (Apple.com, ASOS.com checkout/storefront screens) or were
Unsplash+ (paid) assets, both excluded per this round's sourcing rules.

## Processing applied

- The three illustrative photographs (restaurant/ecommerce/backend) were
  cropped to a consistent 1600×1000 (16:10) landscape frame, centered,
  from each 1600px-wide Pexels source, then re-encoded to WebP
  (`ffmpeg -c:v libwebp -quality 82`), stripping source metadata. Final
  sizes: 22-71KB each.
- The three reused project screenshots (website-development/saas-
  project/custom-web-application) are untouched copies of already-
  processed, already-privacy-reviewed files from `public/images/
  projects/` - no additional crop/re-encode, so there is only ever one
  edited version of each real screenshot in the repo.
- No color grade/filter was applied to any file at the asset level - the
  shared warm/olive treatment specified in the R6 brief is applied at
  render time (a CSS overlay in `services-capability.tsx`), not baked
  into the image, so the same source stays reusable if the treatment
  changes later.

## Rejected candidates (recorded for transparency)

- Ecommerce: Pexels 7190944/7191162/7191166/7190947 (Pavel Danilyuk) -
  all frames from the same real Apple.com checkout flow ("Pick up at an
  Apple Store near you", "13-inchBook Pro") - rejected for recognizable
  retailer branding.
- Ecommerce: Pexels 7621352 (Ivan S) - a real, visible `asos.com/men/`
  browser tab and storefront - rejected for the same reason.
- Ecommerce: Pexels 16675632 - explicitly titled "Shoper website opened
  on the computer" (Shoper is a real ecommerce platform brand) -
  rejected.
- Restaurant: Pexels 12935078/12935088/12935053/12935057 (iMin
  Technology) and 12935087 - all show the "imin" POS-vendor logo/brand
  clearly on the device - rejected in favor of 10660199 (no visible
  brand).
- Unsplash ecommerce-laptop search - the strongest non-generic-MacBook
  results (`6elR6qXxT3s`, `pxTdIY0PWSA`, `7tLT4Ef8UzE`,
  `PYgSzCoL900`) were all Unsplash+ (paid) - excluded per the "no paid
  Unsplash+ assets" rule.
