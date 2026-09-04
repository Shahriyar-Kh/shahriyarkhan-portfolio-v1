import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ExperienceView } from "@/components/views/experience-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getEducation, getExperiences, getPageSeo, getSkills } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.experience!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/experience", ...merged });
}

export default async function ExperiencePage() {
  const [experiences, education, skills] = await Promise.all([getExperiences(), getEducation(), getSkills()]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Experience", pathname: "/experience" }])}
      />
      <ExperienceView
        experiences={experiences.ok ? experiences.data : null}
        education={education.ok ? education.data : null}
        skills={skills.ok ? skills.data : null}
      />
    </>
  );
}
