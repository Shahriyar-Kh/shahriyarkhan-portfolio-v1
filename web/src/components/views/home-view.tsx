import { Reveal } from "@/components/layout/reveal";
import { ClientFaq } from "@/components/sections/client-faq";
import { DualCta } from "@/components/sections/dual-cta";
import { EngineeringApproach } from "@/components/sections/engineering-approach";
import { ExperienceJourney } from "@/components/sections/experience-journey";
import { FeaturedCase } from "@/components/sections/featured-case";
import { Hero } from "@/components/sections/hero";
import { ProfessionalStory } from "@/components/sections/professional-story";
import { ProjectProofTimeline } from "@/components/sections/project-proof-timeline";
import { ProofStrip } from "@/components/sections/proof-strip";
import { ServicesCapability } from "@/components/sections/services-capability";
import { SkillsCapability } from "@/components/sections/skills-capability";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

export interface HomeViewProps {
  projects: readonly Project[] | null;
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
  services: readonly Service[] | null;
  skills: readonly Skill[] | null;
}

/**
 * Composes the FINAL-DESIGN-01A homepage - "Shahriyar Khan — Engineered
 * Impact". Contrast rhythm across the page: Hero(ink) -> ...(ivory)... ->
 * Featured Case(ink) -> ...(ivory)... -> Dual CTA(ink) -> FAQ(ivory) ->
 * Footer(ink) - never two dark bands back to back. Plain and synchronous
 * so the whole tree stays RTL-testable with plain prop fixtures (see
 * home-view.test.tsx), same as before.
 */
export function HomeView({ projects, experiences, education, services, skills }: HomeViewProps) {
  return (
    <>
      <Hero />
      <ProofStrip projects={projects} experiences={experiences} education={education} services={services} />
      <Reveal>
        <ProfessionalStory />
      </Reveal>
      <ProjectProofTimeline projects={projects} />
      <FeaturedCase projects={projects} />
      <ServicesCapability services={services} />
      <SkillsCapability skills={skills} />
      <ExperienceJourney experiences={experiences} />
      <EngineeringApproach />
      <DualCta />
      <Reveal>
        <ClientFaq />
      </Reveal>
    </>
  );
}
