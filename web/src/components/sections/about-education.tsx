import { SectionIndex } from "@/components/motif/section-index";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { ABOUT_EDUCATION_COPY } from "@/content/about";
import type { Education } from "@/lib/api/types";
import { formatMonthYear } from "@/lib/format";

export interface AboutEducationProps {
  education: readonly Education[] | null;
}

/**
 * FINAL-DESIGN-01B-01 Section H - the real, live Education record.
 * Every field (institution, degree, dates, description) renders exactly
 * as the API returns it - the description field already contains real,
 * owner-authored detail (e.g. a graduation year and CGPA) with nothing
 * added or reformatted into a new claim.
 */
export function AboutEducation({ education }: AboutEducationProps) {
  return (
    <Section className="border-t border-border">
      <SectionIndex n="07" label={ABOUT_EDUCATION_COPY.eyebrow} className="mb-6" />
      <h2 className="max-w-xl text-display-sm text-ink-primary sm:text-display-md">{ABOUT_EDUCATION_COPY.title}</h2>

      <div className="mt-10">
        {!education ? (
          <EmptyState title="Education data is temporarily unavailable." />
        ) : education.length === 0 ? (
          <EmptyState title="No published education yet." />
        ) : (
          <ul className="flex flex-col gap-8">
            {education.map((item) => (
              <li key={item.id} className="border-l-2 border-olive/60 pl-6">
                <p className="font-mono text-caption-sm text-ink-hint">
                  {formatMonthYear(item.start_date)} — {item.end_date ? formatMonthYear(item.end_date) : "Present"}
                </p>
                <p className="mt-1.5 text-headline-md text-ink-primary">{item.degree}</p>
                <p className="text-body-sm text-ink-secondary">{item.institution}</p>
                {item.description && <p className="mt-2 max-w-xl text-body-sm text-ink-tertiary">{item.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
