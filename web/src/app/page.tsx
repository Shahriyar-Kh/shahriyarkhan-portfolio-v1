import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { HomeView } from "@/components/views/home-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getEducation, getExperiences, getPageSeo, getProjects, getServices, getSkills } from "@/lib/api";
import { assertHomepageDataAvailable } from "@/lib/api/homepage-availability";
import { profilePageSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.home!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/", ...merged });
}

export default async function HomePage() {
  const [projects, experiences, education, services, skills] = await Promise.all([
    getProjects(),
    getExperiences(),
    getEducation(),
    getServices(),
    getSkills(),
  ]);

  // FINAL-DESIGN-01A-R6-FIX2: education is deliberately excluded from
  // this set - it isn't one of the homepage's four fallback-banner
  // datasets, and a transient education-only blip shouldn't block the
  // rest of the page. Any one of these four failing with a protected
  // error (transport, timeout, 5xx, or schema-invalid) now aborts the
  // whole render, so a partial fallback page can never replace the
  // previous fully-correct last-known-good page - see
  // homepage-availability.ts for the full policy.
  assertHomepageDataAvailable([
    { name: "projects", result: projects },
    { name: "experiences", result: experiences },
    { name: "services", result: services },
    { name: "skills", result: skills },
  ]);

  return (
    <>
      <JsonLd data={profilePageSchema("/")} />
      <HomeView
        projects={projects.ok ? projects.data : null}
        experiences={experiences.ok ? experiences.data : null}
        education={education.ok ? education.data : null}
        services={services.ok ? services.data : null}
        skills={skills.ok ? skills.data : null}
      />
    </>
  );
}
