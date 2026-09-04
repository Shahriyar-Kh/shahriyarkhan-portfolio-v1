import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ResumeView } from "@/components/views/resume-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getDefaultResume, getEducation, getExperiences, getPageSeo, getProjects, getSkills } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";
import { resolveResumePageState } from "@/lib/resume-page-state";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.resume!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/resume", ...merged });
}

export default async function ResumePage() {
  const [resume, experiences, education, skills, projects] = await Promise.all([
    getDefaultResume(),
    getExperiences(),
    getEducation(),
    getSkills(),
    getProjects(),
  ]);

  const state = resolveResumePageState(resume, experiences, education, skills, projects);

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Résumé", pathname: "/resume" }])} />
      <ResumeView state={state} />
    </>
  );
}
