import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ContactDetails } from "@/components/contact/contact-details";
import { CONTACT_FALLBACKS } from "@/content/site";
import type { SiteSettings } from "@/lib/api/types";

function makeSiteSettings(overrides: Partial<SiteSettings> = {}): SiteSettings {
  return {
    id: 1,
    site_name: "Shahriyar Khan",
    owner_name: "Shahriyar Khan",
    public_email: "real@example.com",
    public_phone: "+92 300 1234567",
    public_location: "Islamabad, Pakistan",
    notification_email: "",
    hero_title: "",
    hero_subtitle: "",
    default_seo_title: "",
    default_seo_description: "",
    default_keywords: "",
    footer_text: "",
    social_links: {},
    maintenance_mode: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("ContactDetails", () => {
  it("renders the real live SiteSettings email/phone/location, correctly linked", () => {
    render(<ContactDetails siteSettings={makeSiteSettings()} />);
    const mailLink = screen.getByRole("link", { name: /real@example\.com/ });
    expect(mailLink).toHaveAttribute("href", "mailto:real@example.com");
    const telLink = screen.getByRole("link", { name: /\+92 300 1234567/ });
    expect(telLink).toHaveAttribute("href", "tel:+923001234567");
    expect(screen.getByText("Islamabad, Pakistan")).toBeInTheDocument();
  });

  it("falls back to CONTACT_FALLBACKS only when a live field is empty or the fetch failed", () => {
    render(<ContactDetails siteSettings={null} />);
    expect(screen.getByRole("link", { name: new RegExp(CONTACT_FALLBACKS.email) })).toHaveAttribute(
      "href",
      `mailto:${CONTACT_FALLBACKS.email}`,
    );
    expect(screen.getByText(CONTACT_FALLBACKS.location)).toBeInTheDocument();
  });

  it("falls back to the verified public phone constant when SiteSettings' own field is blank - pre-existing, unchanged fallback semantics", () => {
    render(<ContactDetails siteSettings={makeSiteSettings({ public_phone: "" })} />);
    expect(document.querySelector('a[href^="tel:"]')).toHaveAttribute("href", `tel:${CONTACT_FALLBACKS.phone.replace(/\s+/g, "")}`);
  });

  it("never adds WhatsApp - not currently public/rendered anywhere on the live site", () => {
    render(<ContactDetails siteSettings={makeSiteSettings()} />);
    expect(document.querySelector('a[href*="wa.me"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
  });

  it("links GitHub and LinkedIn with safe external-link behavior (target=_blank, rel=noopener noreferrer)", () => {
    render(<ContactDetails siteSettings={makeSiteSettings()} />);
    const github = screen.getByRole("link", { name: "GitHub" });
    const linkedin = screen.getByRole("link", { name: "LinkedIn" });
    for (const link of [github, linkedin]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      expect(link).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
    }
  });
});
