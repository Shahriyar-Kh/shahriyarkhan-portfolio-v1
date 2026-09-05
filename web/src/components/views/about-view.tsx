import { AboutArchitecture } from "@/components/sections/about-architecture";
import { AboutEducation } from "@/components/sections/about-education";
import { AboutHero } from "@/components/sections/about-hero";
import { AboutNarrative } from "@/components/sections/about-narrative";
import { AboutPrinciples } from "@/components/sections/about-principles";
import { AboutStrengths } from "@/components/sections/about-strengths";
import { AboutTimeline } from "@/components/sections/about-timeline";
import { DualCta } from "@/components/sections/dual-cta";
import { ProofStrip } from "@/components/sections/proof-strip";
import type { Education, Experience, Project, Service, Skill } from "@/lib/api/types";

export interface AboutViewProps {
  skills: readonly Skill[] | null;
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
  projects: readonly Project[] | null;
  services: readonly Service[] | null;
  /** Prefers the live SiteSetting.hero_subtitle - see content/about.ts's
   * ABOUT_SPECIALIZATION_FALLBACK doc comment for why. */
  specialization: string | null;
}

/**
 * FINAL-DESIGN-01B-01 - the premium /about page. Composes nine sections,
 * every one either a section built specifically for this page (see each
 * component's own doc comment for how it differs from its homepage
 * counterpart, where one exists) or a section reused as-is from the
 * approved homepage (ProofStrip, DualCta) - never a re-implementation of
 * either. Every section receives only real, live API data or content
 * already verified in content/about.ts; nothing here invents an
 * employer, a date, a certification, a metric, or a client.
 */
export function AboutView({ skills, experiences, education, projects, services, specialization }: AboutViewProps) {
  return (
    <>
      <AboutHero specialization={specialization} />
      <ProofStrip projects={projects} experiences={experiences} education={education} services={services} />
      <AboutNarrative />
      <AboutTimeline experiences={experiences} />
      <AboutPrinciples />
      <AboutStrengths skills={skills} />
      <AboutArchitecture />
      <AboutEducation education={education} />
      <DualCta />
    </>
  );
}
