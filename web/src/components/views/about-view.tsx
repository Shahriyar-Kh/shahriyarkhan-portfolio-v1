import { AboutArchitecture } from "@/components/sections/about-architecture";
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
  specialization: string | null;
}

/**
 * FINAL-DESIGN-01B-01 - the premium /about page. Composes eight sections,
 * every one either a section built specifically for this page (see each
 * component's own doc comment for how it differs from its homepage
 * counterpart, where one exists) or a section reused as-is from the
 * approved homepage (ProofStrip, DualCta) - never a re-implementation of
 * either. Every section receives only real, live API data or content
 * already verified in content/about.ts; nothing here invents an
 * employer, a date, a certification, a metric, or a client.
 *
 * FINAL-DESIGN-01B-01-R2: Education no longer has its own standalone
 * section - AboutNarrative now folds the real Education record (plus the
 * current role) in as compact milestones, so `education` and
 * `experiences` are passed there too. ProofStrip is rendered with
 * `animated={false}`: it sits just below the hero, close enough to the
 * initial viewport that the shared Counter's count-up-from-0 behavior
 * could show a real project/role count flashing to "0" before settling -
 * see counter.tsx's `animate` prop doc comment. The homepage's own
 * ProofStrip usage is untouched (defaults to animated).
 */
export function AboutView({ skills, experiences, education, projects, services, specialization }: AboutViewProps) {
  return (
    <>
      <AboutHero specialization={specialization} />
      <ProofStrip projects={projects} experiences={experiences} education={education} services={services} animated={false} />
      <AboutNarrative experiences={experiences} education={education} />
      <AboutTimeline experiences={experiences} />
      <AboutPrinciples />
      <AboutStrengths skills={skills} />
      <AboutArchitecture />
      <DualCta />
    </>
  );
}
