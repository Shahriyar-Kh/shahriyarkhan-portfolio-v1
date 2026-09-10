import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ExperienceView } from "@/components/views/experience-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getEducation, getExperiences, getPageSeo } from "@/lib/api";
import { assertRequiredDatasetsAvailable } from "@/lib/api/required-dataset-availability";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.experience!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/experience", ...merged });
}

export default async function ExperiencePage() {
  const [experiences, education] = await Promise.all([getExperiences(), getEducation()]);

  // EXPERIENCE-DATA-01: both datasets are directly, prominently rendered
  // on this page (unlike the homepage, where education is deliberately
  // excluded from its own guard - see required-dataset-availability.ts's
  // module doc) - a transient failure on either one must abort the whole
  // render rather than getting cached by Next's ISR as an honest-looking
  // but stale "temporarily unavailable" page.
  assertRequiredDatasetsAvailable([
    { name: "experiences", result: experiences },
    { name: "education", result: education },
  ]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Experience", pathname: "/experience" }])}
      />
      <ExperienceView
        experiences={experiences.ok ? experiences.data : null}
        education={education.ok ? education.data : null}
      />
    </>
  );
}
