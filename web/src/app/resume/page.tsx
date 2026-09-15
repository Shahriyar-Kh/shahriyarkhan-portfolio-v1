import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ResumeView } from "@/components/views/resume-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getDefaultResume, getEducation, getExperiences, getPageSeo, getProjects, getSiteSettings, getSkills } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";
import { resolveResumePageState } from "@/lib/resume-page-state";

/** B7-RC correction 2: the published master must be visible on the very
 * next request, never up to an hour later and never frozen at build
 * time. `getDefaultResume()` already fetches with `cache: "no-store"`;
 * this route-segment config makes the whole page dynamic explicitly,
 * rather than relying on vinext's static analysis to infer it (vinext's
 * own build output notes it "cannot detect dynamic API usage... at
 * build time" - see the B7 report). Every other route keeps its
 * existing ISR/ static behavior; this applies only to /resume. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.resume!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/resume", ...merged });
}

export default async function ResumePage() {
  const [resume, siteSettings, experiences, education, skills, projects] = await Promise.all([
    getDefaultResume(),
    getSiteSettings(),
    getExperiences(),
    getEducation(),
    getSkills(),
    getProjects(),
  ]);

  const state = resolveResumePageState(resume, siteSettings, experiences, education, skills, projects);

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Résumé", pathname: "/resume" }])} />
      <ResumeView state={state} />
    </>
  );
}
