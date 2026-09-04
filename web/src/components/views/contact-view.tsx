import { ContactDetails } from "@/components/contact/contact-details";
import { InquiryForm } from "@/components/contact/inquiry-form";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import type { ContactIntent } from "@/content/contact";
import type { Service, SiteSettings } from "@/lib/api/types";

export interface ContactViewProps {
  services: readonly Service[] | null;
  siteSettings: SiteSettings | null;
  initialIntent: ContactIntent;
  initialServiceId?: string | null;
}

export function ContactView({ services, siteSettings, initialIntent, initialServiceId }: ContactViewProps) {
  return (
    <Section className="pt-16 sm:pt-20">
      <SectionHeading eyebrow="Contact" title="Get in touch" subtitle="About a role, a project, or backend and full-stack development work." />

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <ContactDetails siteSettings={siteSettings} />
        <InquiryForm
          services={(services ?? []).map((s) => ({ id: s.id, title: s.title }))}
          initialIntent={initialIntent}
          initialServiceId={initialServiceId ?? null}
          sourcePage="/contact"
        />
      </div>
    </Section>
  );
}
