import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ServicesView } from "@/components/views/services-view";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo, getProjects, getServices } from "@/lib/api";
import { breadcrumbSchema, serviceListSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.services!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/services", ...merged });
}

export default async function ServicesPage() {
  const [services, projects] = await Promise.all([getServices(), getProjects()]);

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Services", pathname: "/services" }])} />
      {services.ok && services.data.length > 0 && <JsonLd data={serviceListSchema(services.data)} />}
      <ServicesView services={services.ok ? services.data : null} projects={projects.ok ? projects.data : null} />
    </>
  );
}
