import Link from "next/link";
import { Node } from "@/components/motif/node";
import { Tick } from "@/components/motif/tick";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { SectionIndex } from "@/components/motif/section-index";
import { DualCta } from "@/components/sections/dual-cta";
import { EXPERIENCE_INTRO, PROFESSIONAL_SCOPE } from "@/content/experience-page";
import { getExperienceEvidence } from "@/content/experience-evidence";
import type { Education, Experience } from "@/lib/api/types";
import { formatMonthYear } from "@/lib/format";

export interface ExperienceViewProps {
  experiences: readonly Experience[] | null;
  education: readonly Education[] | null;
}

function RoleDateRange({ role }: { role: Experience }) {
  // Mirrors lib/format.ts's formatDateRange precedence exactly (trust a
  // real end_date over the current_role flag if they ever disagree) -
  // duplicated here only because a <time> pair needs real JSX elements,
  // not the plain string that helper returns.
  const isCurrent = role.current_role && !role.end_date;
  return (
    <Tick>
      <time dateTime={role.start_date}>{formatMonthYear(role.start_date)}</time>
      {" — "}
      {role.end_date ? (
        <time dateTime={role.end_date}>{formatMonthYear(role.end_date)}</time>
      ) : isCurrent ? (
        "Present"
      ) : (
        formatMonthYear(role.start_date)
      )}
    </Tick>
  );
}

/**
 * FINAL-DESIGN-01F-01 - the premium, recruiter-first standalone
 * Experience page. Distinct from About (about-timeline.tsx's alternating
 * center-line cards tell the personal career *narrative*; this is the
 * structured *record* - a single-column editorial register, no
 * alternating sides, no growing connector line duplicating Home's own
 * experience-journey.tsx) and distinct from the homepage preview (full,
 * un-clamped descriptions and achievements here).
 *
 * Composition: hero (real role count, never hardcoded) -> the full
 * register (every real field, evidence-linked only where
 * content/experience-evidence.ts has an explicit, owner-verified
 * mapping - none exist today, so no role shows one) -> Education ->
 * Professional Scope (content/experience-page.ts's real-data-grounded
 * synthesis, replacing the old full skills-by-category grid now that
 * /skills owns that job) -> Career Path (a compact, single-line-per-role
 * progression view - no invented duration/years-of-experience math) ->
 * the established DualCta close.
 */
export function ExperienceView({ experiences, education }: ExperienceViewProps) {
  return (
    <>
      <Section className="pt-16 sm:pt-20">
        <SectionHeading as="h1" eyebrow={EXPERIENCE_INTRO.eyebrow} title={EXPERIENCE_INTRO.title} subtitle={EXPERIENCE_INTRO.lead} />
        {experiences && experiences.length > 0 && (
          <p className="mt-2 font-mono text-caption-sm text-ink-hint">
            {experiences.length} published role{experiences.length === 1 ? "" : "s"}
          </p>
        )}
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Employment</h2>
        <div className="mt-6">
          {!experiences ? (
            <EmptyState title="Experience data is temporarily unavailable." description="Please try again shortly." />
          ) : experiences.length === 0 ? (
            <EmptyState title="No published experience yet." />
          ) : (
            <ol className="flex flex-col">
              {experiences.map((role) => {
                const evidence = getExperienceEvidence(role.id);
                const isCurrent = role.current_role && !role.end_date;
                return (
                  <li key={role.id} className="border-t border-border py-8 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Node filled={isCurrent} aria-hidden />
                          <p className="text-headline-sm text-ink-primary">{role.role_title}</p>
                          {isCurrent && <Badge tone="accent">Current role</Badge>}
                        </div>
                        <p className="mt-1 pl-[calc(0.5rem+8px)] text-body-sm text-ink-secondary">
                          {role.company_name}
                          {role.location ? ` — ${role.location}` : ""}
                        </p>
                      </div>
                      <RoleDateRange role={role} />
                    </div>

                    {role.description && <p className="mt-4 max-w-2xl text-body-sm text-ink-secondary">{role.description}</p>}

                    {role.achievements.length > 0 && (
                      <ul className="mt-3 flex flex-col gap-1.5">
                        {role.achievements.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-body-sm text-ink-secondary">
                            <Node aria-hidden className="mt-1.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {role.technologies.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {role.technologies.map((tech) => (
                          <li key={tech.id}>
                            <Badge>{tech.name}</Badge>
                          </li>
                        ))}
                      </ul>
                    )}

                    {evidence.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                        {evidence.map((project) => (
                          <li key={project.slug}>
                            <Link href={`/work/${project.slug}`} className="text-caption-sm text-primary hover:underline">
                              Built during this role: {project.title} →
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </Section>

      <Section className="border-t border-border">
        <h2 className="text-headline-md text-ink-primary">Education</h2>
        <div className="mt-6">
          {!education ? (
            <EmptyState title="Education data is temporarily unavailable." description="Please try again shortly." />
          ) : education.length === 0 ? (
            <EmptyState title="No published education record yet." />
          ) : (
            <ul className="flex flex-col gap-6">
              {education.map((item) => (
                <li key={item.id} className="border-t border-border pt-4">
                  <p className="text-headline-sm text-ink-primary">{item.degree}</p>
                  <p className="text-body-sm text-ink-secondary">{item.institution}</p>
                  <Tick className="mt-1">
                    <time dateTime={item.start_date}>{formatMonthYear(item.start_date)}</time>
                    {" — "}
                    {item.end_date ? <time dateTime={item.end_date}>{formatMonthYear(item.end_date)}</time> : "Present"}
                  </Tick>
                  {item.description && <p className="mt-2 max-w-2xl text-body-sm text-ink-secondary">{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      {experiences && experiences.length > 0 && (
        <Section className="border-t border-border">
          <SectionIndex n="02" label="Scope" className="mb-4" />
          <h2 className="text-headline-lg text-ink-primary">Professional scope</h2>
          <p className="mt-3 max-w-xl text-body-sm text-ink-secondary">The capability areas this employment record actually supports.</p>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {PROFESSIONAL_SCOPE.map((item, i) => (
              <div key={item.title} className="border-t border-border pt-4">
                <span className="font-mono text-caption text-ink-hint">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-1.5 text-headline-sm text-ink-primary">{item.title}</p>
                <p className="mt-2 text-body-sm text-ink-secondary">{item.body}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {experiences && experiences.length > 1 && (
        <Section className="border-t border-border">
          <SectionIndex n="03" label="Path" className="mb-4" />
          <h2 className="text-headline-lg text-ink-primary">Career path</h2>
          <ol className="mt-6 flex flex-col gap-3">
            {experiences.map((role) => (
              <li key={role.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3">
                <RoleDateRange role={role} />
                <span className="text-body-sm text-ink-primary">
                  {role.role_title} <span className="text-ink-tertiary">— {role.company_name}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <DualCta />
    </>
  );
}
