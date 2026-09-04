import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SkillsView } from "@/components/views/skills-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo, getSkills } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.skills!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/skills", ...merged });
}

export default async function SkillsPage() {
  const skills = await getSkills();

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Skills", pathname: "/skills" }])} />
      <SkillsView skills={skills.ok ? skills.data : null} />
    </>
  );
}
