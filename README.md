<div align="center">
<p align="center">
  <img src="portfolio"
       alt="Project GitHub Cover"
       width="100%" />
</p>
# Shahriyar Khan — Engineering Portfolio Platform

### Personal Brand, Project Showcase, AI Portfolio Assistant & Resume Operations System

**Next.js 16 · React 19 · Django REST Framework · PostgreSQL · Cloudflare Workers · Railway**

A production portfolio platform built as a real full-stack system rather than a static personal website. It combines public portfolio content, project case studies, services, SEO, an evidence-grounded visitor assistant, structured project-discovery intake, and a private résumé/CV management workflow.

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111111">
  <img alt="Django" src="https://img.shields.io/badge/Django-5-092E20?logo=django&logoColor=white">
  <img alt="DRF" src="https://img.shields.io/badge/Django%20REST%20Framework-API-A30000">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white">
  <img alt="Cloudflare" src="https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white">
</p>

</div>

---

## Overview

This repository contains the production release of **shahriyarkhan.com**.

The project began as a portfolio, but evolved into a broader software-engineering platform with four connected concerns:

1. **Public professional presence** — projects, services, skills, experience and case-study content.
2. **Client acquisition workflows** — contact handling and structured project discovery.
3. **AI-assisted portfolio navigation** — a grounded assistant that answers only from verified public portfolio evidence.
4. **Private résumé operations** — versioned CV creation, ATS-readiness checks, job-match assessments and controlled PDF/DOCX exports.

The result is a portfolio system that demonstrates both public product engineering and internal operational tooling.

---

## System Architecture

~~~mermaid
flowchart LR
    V[Portfolio Visitor] --> WEB[Next.js 16 / React 19]
    WEB -->|REST| API[Django / DRF]

    API --> PORT[Portfolio Content]
    API --> SEO[SEO Configuration]
    API --> INQ[Contact & Project Discovery]
    API --> ASSIST[Grounded Portfolio Assistant]
    API --> RESUME[Resume / CV Builder]
    API --> ANALYTICS[Portfolio Analytics]

    PORT --> DB[(PostgreSQL)]
    SEO --> DB
    INQ --> DB
    ASSIST --> DB
    RESUME --> DB
    ANALYTICS --> DB

    ASSIST --> GEMINI[Optional Gemini Provider]
    RESUME --> PDF[PDF Export]
    RESUME --> DOCX[DOCX Export]

    WEB --> CF[Cloudflare Workers]
    API --> RW[Railway]
~~~

---

## Public Portfolio Experience

The frontend uses:

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **GSAP + ScrollTrigger**
- reduced-motion-safe interactions
- server-driven portfolio content
- structured metadata and JSON-LD
- responsive project/service/detail views
- real image provenance controls
- sitemap / robots integration

Public project, service, skill and experience data is served through the Django API rather than being duplicated across frontend files.

That keeps the website presentation layer aligned with one canonical content source.

---

## Grounded Portfolio Assistant

The repository includes a visitor-facing assistant designed around a strong evidence boundary.

### How it works

~~~text
Published portfolio data
        ↓
Evidence bundle
        ↓
Intent + relevance selection
        ↓
Optional Gemini provider
        ↓
Strict structured-response validation
        ↓
Visitor answer with verified sources
~~~

The assistant can answer questions about:

- projects
- skills
- services
- experience
- education
- public professional profile

### Important grounding properties

The assistant does **not** treat the language model as the source of truth.

It only receives published portfolio evidence and validates model output before anything reaches a visitor.

Security/grounding protections include:

- source IDs must exist in the supplied evidence set
- recommended project/service slugs must be real and published
- intents are allow-listed
- response length is bounded
- external URLs are rejected
- invalid model output falls back to a deterministic provider
- private inquiry/resume/account data is structurally excluded from assistant context
- visitor conversation transcripts are not persisted

This gives the project evidence of practical AI integration without turning the portfolio into an unrestricted chatbot.

---

## Client Project Discovery

The portfolio includes a guided project-discovery workflow for prospective clients.

Rather than collecting only a free-text contact message, the system can capture structured requirements such as:

- organization
- project type
- business problem
- required features
- timeline
- budget context
- technical constraints
- additional notes

The discovery flow reuses the established inquiry pipeline and stores a deterministic summary of visitor-approved data.

AI-generated draft suggestions can assist the visitor, but the persisted business record remains based on the visitor's structured input rather than autonomous model output.

---

## Resume / CV Management System

The private administration side includes a dedicated résumé-management domain.

This is substantially more than uploading a PDF.

### Capabilities

- canonical resume source facts
- versioned resume snapshots
- master and tailored résumé variants
- lifecycle states
- controlled approval before export
- ATS readiness assessment
- job-description matching
- job application records
- PDF export
- DOCX export
- export integrity validation
- artifact hashes
- duplicate-safe/idempotent generation

### ATS assessment model

The system stores assessment evidence against:

- resume version
- ruleset version
- resume content hash
- source-data hash
- job-description hash where applicable

This prevents an old ATS score from being silently treated as current after the underlying résumé changes.

### Controlled exports

PDF and DOCX generation is restricted to approved resume versions and authorized administration users.

Generated artifacts are validated and hashed before being stored as canonical exports.

---

## Administration & Content Operations

The Django backend provides administration for portfolio and operational content, including areas such as:

- projects
- skills
- services
- experience
- site configuration
- SEO data
- analytics
- inquiries / project requests
- résumé versions and assessments

The admin side acts as a content and operations system, not just Django's default model browser.

---

## SEO Engineering

SEO is treated as application functionality rather than a final meta-tag pass.

The codebase includes:

- dynamic metadata
- canonical handling
- sitemap generation
- robots configuration
- JSON-LD
- project/service route metadata
- SEO configuration APIs
- content-integrity tests
- publication-state controls

The frontend also contains regression guards to prevent fabricated project media/content from entering the release.

---

## Content Integrity & Provenance

A major design goal is to keep the portfolio truthful.

The repository contains explicit safeguards against:

- fabricated metrics
- fabricated testimonials
- fake project screenshots
- unresolved draft projects leaking publicly
- unsupported certifications
- stale/legacy frontend content
- hardcoded duplicate portfolio records

The included **PROVENANCE.md** documents how this clean release was produced and which legacy/development artifacts were intentionally excluded.

---

## Testing & CI

Both backend and frontend are covered by automated checks.

### Backend CI

~~~text
Django system check
→ migration consistency check
→ complete Django test suite
~~~

### Frontend CI

~~~text
npm ci
→ TypeScript
→ ESLint
→ Vitest
→ production build
→ dependency audit
~~~

The frontend test surface includes:

- accessibility-oriented tests
- route/view tests
- assistant UI tests
- project-discovery tests
- metadata and JSON-LD tests
- sitemap tests
- motion/reduced-motion behavior
- content-truth guards
- project-media provenance guards
- privacy-consistency guards

The backend contains dedicated suites for:

- assistant grounding
- provider/schema validation
- project discovery
- inquiries
- resume builder
- ATS assessments
- export lifecycle
- public snapshot parity
- SEO/site configuration

---

## Production Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 / React 19 |
| Frontend hosting | Cloudflare Workers |
| Backend | Django / Django REST Framework |
| Backend hosting | Railway |
| Database | Neon PostgreSQL |
| Styling | Tailwind CSS 4 |
| Motion | GSAP / ScrollTrigger |
| AI provider | Gemini, optional with deterministic fallback |
| Documents | ReportLab / python-docx / pypdf |

Live site:

**https://shahriyarkhan.com/**

---

## Repository Structure

~~~text
shahriyarkhan-portfolio-v1/
├── web/
│   ├── src/app/
│   ├── src/components/
│   │   ├── assistant/
│   │   ├── contact/
│   │   ├── seo/
│   │   ├── views/
│   │   └── work/
│   ├── src/lib/
│   ├── src/test-guards/
│   └── scripts/
│
├── backend/
│   ├── apps/
│   │   ├── portfolio/
│   │   ├── assistant/
│   │   ├── inquiries/
│   │   ├── resume_builder/
│   │   ├── seo/
│   │   ├── analytics_app/
│   │   └── site_config/
│   ├── templates/admin/
│   └── requirements/
│
├── docs/rebuild/
├── PROVENANCE.md
└── .github/workflows/ci.yml
~~~

---

## Local Development

### Frontend

~~~bash
cd web
nvm use
npm ci
cp .env.example .env.local
npm run dev
~~~

### Backend

~~~bash
cd backend
python -m venv .venv
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
~~~

---

## Engineering Evidence for Reviewers

Useful entry points:

- \`backend/apps/assistant/\` — grounded visitor assistant
- \`docs/rebuild/PORTFOLIO_ASSISTANTS_01_ARCHITECTURE.md\` — assistant architecture
- \`docs/rebuild/PORTFOLIO_ASSISTANTS_01_SECURITY_AND_GROUNDING.md\` — AI safety boundary
- \`backend/apps/inquiries/\` — contact/project-discovery pipeline
- \`backend/apps/resume_builder/\` — résumé operations domain
- \`backend/apps/resume_builder/services/ats/\` — ATS rules and assessment
- \`backend/apps/resume_builder/services/exports/\` — PDF/DOCX generation
- \`backend/apps/seo/\` — SEO data/configuration
- \`web/src/components/assistant/\` — assistant and discovery UI
- \`web/src/components/seo/json-ld.tsx\` — structured data
- \`web/src/test-guards/\` — content/release integrity tests
- \`.github/workflows/ci.yml\` — release quality gate

---

## Project Status

This repository represents the current production portfolio release and its associated operational systems.

The project is intentionally presented as:

**Portfolio + client acquisition + grounded AI assistant + résumé operations**

rather than as a static frontend showcase.

---

## Author

**Shahriyar Khan**  
Software Engineer · Full-Stack Python Developer

**Core focus:** Python · Django · Django REST Framework · FastAPI · React / Next.js · PostgreSQL · AI Integration

- GitHub: [@Shahriyar-Kh](https://github.com/Shahriyar-Kh)
- Portfolio: [shahriyarkhan.com](https://shahriyarkhan.com)
- LinkedIn: [Shahriyar Khan](https://www.linkedin.com/in/shahriyar-khan-developer/)

---

<div align="center">

**Personal brand · full-stack engineering · grounded AI · client discovery · ATS résumé operations**

</div>
