import type { Metadata } from "next";
import { PrivacyView } from "@/components/views/privacy-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo } from "@/lib/api";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.privacy!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/privacy", ...merged });
}

export default function PrivacyPage() {
  return <PrivacyView />;
}
