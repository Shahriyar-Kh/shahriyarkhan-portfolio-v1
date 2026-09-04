import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ServicesView } from "@/components/views/services-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo, getServices } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.services!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/services", ...merged });
}

export default async function ServicesPage() {
  const services = await getServices();

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Services", pathname: "/services" }])} />
      <ServicesView services={services.ok ? services.data : null} />
    </>
  );
}
