import type { Metadata } from "next";
import { WorkView } from "@/components/views/work-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo, getProjects } from "@/lib/api";
import { buildMetadata } from "@/lib/metadata";
import { mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.work!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/work", ...merged });
}

export default async function WorkPage() {
  const result = await getProjects();
  return <WorkView projects={result.ok ? result.data : null} />;
}
