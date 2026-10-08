# Service image provenance

Every file in this directory is either (a) a custom-crafted illustrative architecture/interface visual designed specifically to represent one of Shahriyar's software engineering services, (b) a historical screenshot of Shahriyar's own public project or portfolio, or (c) a commercially-usable licensed photograph used as illustrative media.

None of the service visuals are presented as proof of an uncompleted or fabricated client project. They provide truthful technical atmosphere, domain architecture, and interface clarity matching the real service offerings.

See `src/components/sections/services-capability.test.tsx`'s "SERVICES_MEDIA data integrity" suite for the mechanical guard that every service slug maps to a local file, every mapped file exists on disk, and every illustrative entry is cross-referenced against this file.

## Canonical 6-service illustrative architecture visuals

These six assets correspond to the 6 featured home services, rendered at a uniform 1376×768 landscape resolution to provide visual parity and responsive stability across desktop (3×2), tablet (2-col), and mobile (1-col) cards:

| Service Slug | File | Visual Domain | Description / Notes |
|---|---|---|---|
| custom-software-development | custom-web-application.webp (1376×768) | Enterprise operations / workflows / integration dashboard | Illustrative enterprise order fulfillment and workflow automation platform (Syncra OpsFlow), showcasing webhook triggers, operational validation nodes, and third-party integrations. |
| web-development | website-development.webp (1376×768) | Modern web product / website interface | Illustrative modern AI-powered operations web application landing interface (AetherFlow), featuring dark luxury styling, predictive analytics preview, and metrics visualization. |
| application-development | application-development.webp (1376×768) | Application workspace / management interface | Illustrative multi-screen project hub and management platform (TaskFlow), featuring kanban task workflows, analytics sidebar, and role-based access controls (RBAC). |
| saas-development | saas-project.webp (1376×768) | Multi-tenant SaaS dashboard / subscriptions / usage | Illustrative multi-tenant SaaS dashboard (Aura Cloud), displaying subscription tiers, recurring revenue metrics (MRR), and API request usage quotas. |
| database-development | backend-development.webp (1376×768) | Schema / relational data architecture / database system | Illustrative relational database schema architecture (CommerceDB), mapping PostgreSQL tables, foreign key relationships, indexes, and active query performance metrics. |
| cloud-application-development | portfolio-website.webp (1376×768) | Cloud infrastructure / deployment / services topology | Illustrative Kubernetes cluster topology and CI/CD deployment pipelines dashboard (CloudOps Direct), displaying container status, worker health, and build/deploy pipelines. |

## Historical stock & reference assets

| Slug / Reference | File | Platform / License | Notes |
|---|---|---|---|
| restaurant-website | restaurant-website.webp | Pexels (Andrea Davis, 10660199) | Historical food/hospitality concept reference. |
| ecommerce-website | ecommerce-website.webp | Pexels (Nataliya Vaitkevich, 6214474) | Historical ecommerce storefront reference. |

## Processing applied

- All six canonical service images are formatted as WebP at 1376×768 resolution (16:9 aspect ratio).
- Uniform resolution guarantees identical card heights, zero vertical jitter, and predictable responsive layout across desktop, tablet, and mobile.
- Rendered with CSS `object-cover object-center` within a 16:10 or 3:2 viewport frame.
