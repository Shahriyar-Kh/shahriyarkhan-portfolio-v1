import { ExternalLink } from "@/components/ui/external-link";
import { Icon } from "@/components/ui/icon";
import { CONTACT_FALLBACKS, SOCIAL_LINKS } from "@/content/site";
import type { SiteSettings } from "@/lib/api/types";

export interface ContactDetailsProps {
  siteSettings: SiteSettings | null;
}

/** Prefers the live SiteSetting fields, falling back to CONTACT_FALLBACKS
 * only when a field is empty or the fetch failed - same pattern as
 * site-footer.tsx. */
export function ContactDetails({ siteSettings }: ContactDetailsProps) {
  const email = siteSettings?.public_email || CONTACT_FALLBACKS.email;
  const phone = siteSettings?.public_phone || CONTACT_FALLBACKS.phone;
  const location = siteSettings?.public_location || CONTACT_FALLBACKS.location;

  return (
    <div className="flex flex-col gap-4">
      <a href={`mailto:${email}`} className="flex items-center gap-3 text-body-sm text-ink-secondary hover:text-ink-primary">
        <Icon.Mail size={18} aria-hidden />
        {email}
      </a>
      {phone && (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} className="flex items-center gap-3 text-body-sm text-ink-secondary hover:text-ink-primary">
          <Icon.Phone size={18} aria-hidden />
          {phone}
        </a>
      )}
      <p className="flex items-center gap-3 text-body-sm text-ink-secondary">
        <Icon.MapPin size={18} aria-hidden />
        {location}
      </p>
      <div className="mt-2 flex items-center gap-4">
        <ExternalLink href={SOCIAL_LINKS.github} aria-label="GitHub" className="text-ink-tertiary hover:text-ink-primary" data-analytics-event="outbound_github">
          <Icon.Github size={20} />
        </ExternalLink>
        <ExternalLink href={SOCIAL_LINKS.linkedin} aria-label="LinkedIn" className="text-ink-tertiary hover:text-ink-primary" data-analytics-event="outbound_linkedin">
          <Icon.Linkedin size={20} />
        </ExternalLink>
      </div>
    </div>
  );
}
