import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ContactView } from "@/components/views/contact-view";
import { CONTACT_INTENTS } from "@/content/contact";
import { ROUTE_METADATA_DEFAULTS } from "@/content/metadata";
import { getPageSeo, getServices, getSiteSettings } from "@/lib/api";
import { breadcrumbSchema } from "@/lib/json-ld";
import { buildMetadata, mergePageSeo } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const defaults = ROUTE_METADATA_DEFAULTS.contact!;
  const pageSeo = await getPageSeo(defaults.pageKey);
  const merged = mergePageSeo(defaults, pageSeo.ok ? pageSeo.data : null);
  return buildMetadata({ pathname: "/contact", ...merged });
}

interface ContactPageProps {
  searchParams: Promise<{ intent?: string; service?: string }>;
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const [{ intent, service }, services, siteSettings] = await Promise.all([
    searchParams,
    getServices(),
    getSiteSettings(),
  ]);
  const initialIntent = CONTACT_INTENTS.find((option) => option.value === intent)?.value ?? "general";
  const resolvedServices = services.ok ? services.data : null;
  // Only accept a service id that genuinely exists in the published list -
  // never trust the query param blindly into the form's initial state.
  const initialServiceId = resolvedServices?.some((s) => String(s.id) === service) ? service! : null;

  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: "Home", pathname: "/" }, { name: "Contact", pathname: "/contact" }])} />
      <ContactView
        services={resolvedServices}
        siteSettings={siteSettings.ok ? siteSettings.data : null}
        initialIntent={initialIntent}
        initialServiceId={initialServiceId}
      />
    </>
  );
}
