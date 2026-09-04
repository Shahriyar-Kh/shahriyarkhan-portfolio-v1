import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ServiceDetailView } from "@/components/views/service-detail-view";
import { ProjectUnavailableView } from "@/components/views/project-detail-view";
import { ENGAGEMENT_STEPS, SERVICE_FRAMING } from "@/content/services";
import { getProjects, getServiceBySlug, getServices } from "@/lib/api";
import { breadcrumbSchema, serviceSchema } from "@/lib/json-ld";
import { buildMetadata } from "@/lib/metadata";
import { resolveServicePageState } from "@/lib/service-page-state";

export const revalidate = 1800;
export const dynamicParams = true;

export async function generateStaticParams() {
  const result = await getServices();
  if (!result.ok) return [];
  return result.data.map((service) => ({ slug: service.slug }));
}

interface ServiceDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getServiceBySlug(slug);
  const state = resolveServicePageState(result);

  if (state.kind !== "ready") {
    return buildMetadata({ pathname: `/services/${slug}`, title: "Service", description: "A software engineering service." });
  }

  return buildMetadata({
    pathname: `/services/${slug}`,
    title: state.service.seo_title || state.service.title,
    description: state.service.seo_description || state.service.description,
    keywords: state.service.seo_keywords || undefined,
  });
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { slug } = await params;
  const [serviceResult, projectsResult] = await Promise.all([getServiceBySlug(slug), getProjects()]);
  const state = resolveServicePageState(serviceResult);

  if (state.kind === "not_found") notFound();
  if (state.kind === "unavailable") return <ProjectUnavailableView message={state.message} />;

  const framing = SERVICE_FRAMING[state.service.slug];
  const allProjects = projectsResult.ok ? projectsResult.data : [];
  const relatedProjects = (framing?.relatedProjectSlugs ?? [])
    .map((relatedSlug) => allProjects.find((p) => p.slug === relatedSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({ slug: p.slug, title: p.title }));

  const schema = serviceSchema(state.service, framing);

  return (
    <>
      {schema && <JsonLd data={schema} />}
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", pathname: "/" },
          { name: "Services", pathname: "/services" },
          { name: state.service.title, pathname: `/services/${state.service.slug}` },
        ])}
      />
      <ServiceDetailView
        service={state.service}
        framing={framing}
        engagementSteps={framing?.engagementSteps ?? ENGAGEMENT_STEPS}
        relatedProjects={relatedProjects}
      />
    </>
  );
}
