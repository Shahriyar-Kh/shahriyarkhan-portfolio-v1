import Link from "next/link";
import { Node } from "@/components/motif/node";
import { Tick } from "@/components/motif/tick";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SKILL_LEVEL_LABELS } from "@/lib/api/types";
import { formatDateRange, formatMonthYear } from "@/lib/format";
import type { ResumePageState } from "@/lib/resume-page-state";

export interface ResumeViewProps {
  state: ResumePageState;
}

/**
 * Certifications are deliberately not rendered here - no verified
 * certification model or IDs exist in the repo (OPEN_DECISIONS.md #17).
 * The PDF download is unconditional: it's a bundled static asset, so this
 * page structurally cannot break even when every API call fails (see
 * lib/resume-page-state.ts's resolveResumePageState).
 */
export function ResumeView({ state }: ResumeViewProps) {
  return (
    <>
      <Section className="pt-16 pb-8 sm:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Résumé"
            title="Shahriyar Khan"
            subtitle={state.summary ?? "Experience, education, and core technical skills."}
          />
          <Button href={state.pdfHref} data-analytics-event="resume_download">
            Download PDF
          </Button>
        </div>
        {state.usedFallback && (
          <p className="mt-4 text-caption-sm text-ink-hint">
            Composed from the live employment and education record below.
          </p>
        )}
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Experience</h2>
        <ol className="mt-6 flex flex-col gap-6 border-l border-border pl-6">
          {state.experiences.map((role) => (
            <li key={role.id} className="relative">
              <Node filled={role.current_role} className="absolute top-1.5 -left-[calc(1.5rem+3px)]" />
              <p className="text-body font-medium text-ink-primary">
                {role.role_title} — {role.company_name}
              </p>
              <Tick className="mt-1">{formatDateRange(role.start_date, role.end_date, role.current_role)}</Tick>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Education</h2>
        <ul className="mt-6 flex flex-col gap-4">
          {state.education.map((item) => (
            <li key={item.id}>
              <p className="text-body font-medium text-ink-primary">{item.degree}</p>
              <p className="text-body-sm text-ink-secondary">{item.institution}</p>
              <Tick className="mt-1">
                {formatMonthYear(item.start_date)} — {item.end_date ? formatMonthYear(item.end_date) : "Present"}
              </Tick>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Core skills</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {state.skills.map((skill) => (
            <li key={skill.id}>
              <Badge>
                {skill.name} · {SKILL_LEVEL_LABELS[skill.level]}
              </Badge>
            </li>
          ))}
        </ul>
      </Section>

      {state.projects.length > 0 && (
        <Section className="border-t border-border">
          <h2 className="text-headline-md text-ink-primary">Selected projects</h2>
          <ul className="mt-6 flex flex-col gap-2">
            {state.projects.map((project) => (
              <li key={project.id}>
                <Link href={`/work/${project.slug}`} className="text-body-sm text-primary hover:underline">
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
