import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { PRIVACY_INTRO, PRIVACY_SECTIONS } from "@/content/privacy";

export function PrivacyView() {
  return (
    <Section className="pt-16 pb-20 sm:pt-20">
      <SectionHeading eyebrow="Privacy" title="Privacy" subtitle={PRIVACY_INTRO} />

      <div className="mt-10 flex max-w-2xl flex-col gap-8">
        {PRIVACY_SECTIONS.map((section) => (
          <div key={section.heading} className="border-t border-border pt-4">
            <h2 className="text-headline-sm text-ink-primary">{section.heading}</h2>
            <p className="mt-2 text-body-sm text-ink-secondary">{section.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
