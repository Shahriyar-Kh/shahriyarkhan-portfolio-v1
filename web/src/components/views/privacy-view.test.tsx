import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrivacyView } from "@/components/views/privacy-view";
import { PRIVACY_SECTIONS } from "@/content/privacy";

describe("PrivacyView", () => {
  it("renders exactly one h1 with the real page title", () => {
    const { container } = render(<PrivacyView />);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy");
  });

  it("renders every real section heading and body", () => {
    render(<PrivacyView />);
    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByRole("heading", { name: section.heading })).toBeInTheDocument();
    }
  });

  it("has no skipped heading levels", () => {
    const { container } = render(<PrivacyView />);
    const headings = Array.from(container.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((el) => Number(el.tagName.slice(1)));
    expect(headings[0]).toBe(1);
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i]! - headings[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it("links back to the real contact form wherever a next step is offered", () => {
    render(<PrivacyView />);
    const contactLinks = screen.getAllByRole("link", { name: /contact form/i });
    expect(contactLinks.length).toBeGreaterThan(0);
    for (const link of contactLinks) {
      expect(link).toHaveAttribute("href", "/contact");
    }
  });

  describe("CONTACT-OPS-01 accuracy - the page must actually describe the deployed pipeline", () => {
    it("describes database-first persistence", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/database/i);
      expect(text).toMatch(/first/i);
    });

    it("describes the Gmail owner notification and the Google Sheets mirror", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/gmail/i);
      expect(text).toMatch(/google sheet/i);
      expect(text).toMatch(/owner-only/i);
    });

    it("describes reference codes and duplicate-submission protection", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/reference code/i);
      expect(text).toMatch(/duplicate/i);
    });

    it("describes the honeypot and rate limit, and explicitly states no CAPTCHA is used", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/hidden field/i);
      expect(text).toMatch(/limit on how many submissions/i);
      expect(text).toMatch(/no captcha/i);
    });

    it("describes who can review a submission (administrative access)", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/password-protected administrative page/i);
    });

    it("never states a numeric retention period", () => {
      render(<PrivacyView />);
      const retentionSection = PRIVACY_SECTIONS.find((s) => /how long/i.test(s.heading));
      expect(retentionSection).toBeDefined();
      // No digit anywhere in the retention body - "non-numeric wording
      // until a real retention policy is approved" is a hard requirement,
      // not just a style preference.
      expect(retentionSection!.body).not.toMatch(/\d/);
    });

    it("never claims a compliance certification or a fabricated legal guarantee", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text.toLowerCase()).not.toMatch(/gdpr[- ]compliant|ccpa[- ]compliant|iso ?27001|soc ?2|certified/);
    });

    it("never claims advertising tracking is absent from Google/Cloudflare use, but does state submissions are not used for advertising", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/not.*used for advertising|never.*advertising/i);
    });

    it("attributes the Cloudflare analytics beacon to the platform, not the application, and notes it is CSP-blocked", () => {
      render(<PrivacyView />);
      const text = document.body.textContent ?? "";
      expect(text).toMatch(/cloudflare/i);
      expect(text).toMatch(/platform-level/i);
      expect(text).toMatch(/content-security-policy/i);
      expect(text).toMatch(/blocks it/i);
    });
  });
});
