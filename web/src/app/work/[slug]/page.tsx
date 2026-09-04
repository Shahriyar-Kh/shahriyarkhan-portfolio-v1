import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { ProjectDetailView, ProjectUnavailableView } from "@/components/views/project-detail-view";
import { getCaseStudy } from "@/content/case-studies";
import { getProject, getProjects } from "@/lib/api";
import { breadcrumbSchema, projectSchema } from "@/lib/json-ld";
import { buildMetadata } from "@/lib/metadata";
import { resolveProjectPageState } from "@/lib/project-page-state";

export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const result = await getProjects();
  if (!result.ok) return [];
  return result.data.map((project) => ({ slug: project.slug }));
}

interface WorkDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: WorkDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProject(slug);
  const state = resolveProjectPageState(result);

  if (state.kind !== "ready") {
    return buildMetadata({
      pathname: `/work/${slug}`,
      title: "Project",
      description: "A selected software engineering project.",
    });
  }

  return buildMetadata({
    pathname: `/work/${slug}`,
    title: state.project.seo_title || state.project.title,
    description: state.project.seo_description || state.project.description,
    keywords: state.project.seo_keywords || undefined,
  });
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;
  const result = await getProject(slug);
  const state = resolveProjectPageState(result);

  if (state.kind === "not_found") notFound();
  if (state.kind === "unavailable") return <ProjectUnavailableView message={state.message} />;

  const caseStudy = getCaseStudy(state.project.slug);

  return (
    <>
      <JsonLd data={projectSchema(state.project)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", pathname: "/" },
          { name: "Work", pathname: "/work" },
          { name: state.project.title, pathname: `/work/${state.project.slug}` },
        ])}
      />
      <ProjectDetailView project={state.project} caseStudy={caseStudy} />
    </>
  );
}
